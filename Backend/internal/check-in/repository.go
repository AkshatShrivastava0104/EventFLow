package checkin

import (
	"context"
	"errors"
	"time"

	apperrors "github.com/AkshatShrivastava0104/EventFlow/internal/errors"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{
		db: db,
	}
}

func (r *Repository) CheckIn(
	ctx context.Context,
	eventID int64,
	ticketNumber string,
	volunteerID *int64,
) (int64, error) {

	const maxRetries = 3

	for attempt := 0; attempt < maxRetries; attempt++ {

		checkinID, err := r.checkInOnce(
			ctx,
			eventID,
			ticketNumber,
			volunteerID,
		)

		if err == nil {
			return checkinID, nil
		}

		// PostgreSQL deadlock / serialization failure.
		// Retry the whole transaction.
		if isRetryableCheckInError(err) {
			if attempt == maxRetries-1 {
				return 0, err
			}

			select {
			case <-ctx.Done():
				return 0, ctx.Err()

			case <-time.After(
				time.Duration(attempt+1) * 25 * time.Millisecond,
			):
			}

			continue
		}

		return 0, err
	}

	return 0, errors.New("check-in failed after retries")
}

func (r *Repository) checkInOnce(
	ctx context.Context,
	eventID int64,
	ticketNumber string,
	volunteerID *int64,
) (int64, error) {

	ctx, cancel := context.WithTimeout(
		ctx,
		5*time.Second,
	)
	defer cancel()

	tx, err := r.db.BeginTx(
		ctx,
		pgx.TxOptions{},
	)
	if err != nil {
		return 0, err
	}

	defer func() {
		_ = tx.Rollback(ctx)
	}()

	// --------------------------------------------------
	// 1. Find ticket belonging to this event
	// --------------------------------------------------

	var ticketID int64

	err = tx.QueryRow(ctx, `
		SELECT t.id
		FROM tickets t
		INNER JOIN registrations r
			ON r.id = t.registration_id
		WHERE t.ticket_number = $1
		  AND r.event_id = $2
		  AND r.status != 'cancelled'
	`,
		ticketNumber,
		eventID,
	).Scan(&ticketID)

	if err != nil {

		if errors.Is(err, pgx.ErrNoRows) {
			return 0, apperrors.ErrNotFound
		}

		return 0, err
	}

	// --------------------------------------------------
	// 2. Insert check-in
	//
	// The UNIQUE constraint on ticket_id is the
	// final concurrency/idempotency protection.
	// --------------------------------------------------

	var checkinID int64

	err = tx.QueryRow(ctx, `
		INSERT INTO checkins (
			ticket_id,
			volunteer_id,
			checked_in_at
		)
		VALUES (
			$1,
			$2,
			NOW()
		)
		RETURNING id
	`,
		ticketID,
		volunteerID,
	).Scan(&checkinID)

	if err != nil {

		if isUniqueViolation(err) {
			return 0, apperrors.ErrConflict
		}

		return 0, err
	}

	// --------------------------------------------------
	// 3. Commit
	// --------------------------------------------------

	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}

	return checkinID, nil
}

func isUniqueViolation(err error) bool {

	var pgErr *pgconn.PgError

	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}

	return false
}

func isRetryableCheckInError(err error) bool {

	var pgErr *pgconn.PgError

	if errors.As(err, &pgErr) {

		return pgErr.Code == "40P01" ||
			pgErr.Code == "40001"
	}

	return false
}