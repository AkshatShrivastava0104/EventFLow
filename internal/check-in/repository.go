package checkin

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
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

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return 0, err
	}

	defer func() {
		_ = tx.Rollback(ctx)
	}()

	// --------------------------------------------------
	// 1. Find ticket and verify it belongs to this event
	// --------------------------------------------------

	var ticketID int64

	err = tx.QueryRow(ctx, `
		SELECT t.id
		FROM tickets t
		INNER JOIN registrations r
			ON r.id = t.registration_id
		WHERE t.ticket_number = $1
		  AND r.event_id = $2
		FOR UPDATE
	`,
		ticketNumber,
		eventID,
	).Scan(&ticketID)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, errors.New(
				"valid ticket not found for this event",
			)
		}

		return 0, err
	}

	// --------------------------------------------------
	// 2. Check whether ticket is already checked in
	// --------------------------------------------------

	var existingCheckinID int64

	err = tx.QueryRow(ctx, `
		SELECT id
		FROM checkins
		WHERE ticket_id = $1
	`, ticketID).Scan(&existingCheckinID)

	if err == nil {
		return 0, errors.New("ticket already checked in")
	}

	if !errors.Is(err, pgx.ErrNoRows) {
		return 0, err
	}

	// --------------------------------------------------
	// 3. Create check-in
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
		return 0, err
	}

	// --------------------------------------------------
	// 4. Commit
	// --------------------------------------------------

	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}

	return checkinID, nil
}