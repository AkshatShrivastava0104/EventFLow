package waitlist

import (
	"context"
	"errors"
	"strconv"
	"time"

	apperrors "github.com/AkshatShrivastava0104/EventFlow/internal/errors"
	"github.com/AkshatShrivastava0104/EventFlow/internal/outbox"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db         *pgxpool.Pool
	outboxRepo *outbox.Repository
}

func NewRepository(
	db *pgxpool.Pool,
	outboxRepo *outbox.Repository,
) *Repository {
	return &Repository{
		db:         db,
		outboxRepo: outboxRepo,
	}
}

func (r *Repository) AddToWaitlist(
	ctx context.Context,
	eventID int64,
	userID int64,
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

	// Lock event row so two users cannot
	// calculate the same position concurrently.
	var status string

	err = tx.QueryRow(ctx, `
		SELECT status
		FROM events
		WHERE id = $1
		FOR UPDATE
	`, eventID).Scan(&status)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, errors.New("event not found")
		}

		return 0, err
	}

	if status != "published" {
		return 0, apperrors.ErrEventNotPublished
	}

	// Check whether user is already registered.
	var registrationID int64

	err = tx.QueryRow(ctx, `
		SELECT id
		FROM registrations
		WHERE user_id = $1
		  AND event_id = $2
		  AND status != 'cancelled'
	`, userID, eventID).Scan(&registrationID)

	if err == nil {
		return 0, apperrors.ErrConflict
	}

	if errors.Is(err, pgx.ErrNoRows) {
		return 0, apperrors.ErrEventNotFound
	}

	// Get next position.
	var position int

	err = tx.QueryRow(ctx, `
		SELECT COALESCE(MAX(position), 0) + 1
		FROM waitlist
		WHERE event_id = $1
	`, eventID).Scan(&position)

	if err != nil {
		return 0, err
	}

	// Add user to waitlist.
	var waitlistID int64

	err = tx.QueryRow(ctx, `
		INSERT INTO waitlist (
			user_id,
			event_id,
			position,
			created_at
		)
		VALUES ($1, $2, $3, NOW())
		RETURNING id
	`,
		userID,
		eventID,
		position,
	).Scan(&waitlistID)

	if err != nil {
		if isUniqueViolation(err) {
			return 0, apperrors.ErrAlreadyWaitlisted
		}

		return 0, err
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}

	return waitlistID, nil
}

func registrationStatusForPrice(price float64) string {
	if price <= 0 {
		return "registered"
	}

	return "pending"
}

func (r *Repository) PromoteNextUser(
	ctx context.Context,
	eventID int64,
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
	// 1. Lock event row
	// --------------------------------------------------

	var capacity *int
	var price float64

	err = tx.QueryRow(ctx, `
		SELECT
			capacity,
			COALESCE(price, 0)
		FROM events
		WHERE id = $1
		FOR UPDATE
	`, eventID).Scan(&capacity, &price)

	if err != nil {

		if errors.Is(err, pgx.ErrNoRows) {
			return 0, apperrors.ErrEventNotFound
		}

		return 0, err
	}

	// --------------------------------------------------
	// 2. Check active registrations
	// --------------------------------------------------

	var activeRegistrations int

	err = tx.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM registrations
		WHERE event_id = $1
		  AND status != 'cancelled'
	`, eventID).Scan(&activeRegistrations)

	if err != nil {
		return 0, err
	}

	// Event is already full.
	if capacity != nil &&
		activeRegistrations >= *capacity {

		if err := tx.Commit(ctx); err != nil {
			return 0, err
		}

		return 0, nil
	}

	// --------------------------------------------------
	// 3. Get first waitlisted user
	// --------------------------------------------------

	var waitlistID int64
	var userID int64

	err = tx.QueryRow(ctx, `
		SELECT
			id,
			user_id
		FROM waitlist
		WHERE event_id = $1
		ORDER BY position ASC, created_at ASC
		LIMIT 1
		FOR UPDATE
	`, eventID).Scan(
		&waitlistID,
		&userID,
	)

	if err != nil {

		if errors.Is(err, pgx.ErrNoRows) {

			if err := tx.Commit(ctx); err != nil {
				return 0, err
			}

			return 0, nil
		}

		return 0, err
	}

	// --------------------------------------------------
	// 4. Make sure user doesn't already have registration
	// --------------------------------------------------

	var existingRegistrationID int64

	err = tx.QueryRow(ctx, `
		SELECT id
		FROM registrations
		WHERE user_id = $1
		  AND event_id = $2
		  AND status != 'cancelled'
	`,
		userID,
		eventID,
	).Scan(&existingRegistrationID)

	if err == nil {

		// Remove stale waitlist entry.
		_, err = tx.Exec(ctx, `
			DELETE FROM waitlist
			WHERE id = $1
		`, waitlistID)

		if err != nil {
			return 0, err
		}

		if err := tx.Commit(ctx); err != nil {
			return 0, err
		}

		return 0, nil
	}

	if !errors.Is(err, pgx.ErrNoRows) {
		return 0, err
	}

	// --------------------------------------------------
	// 5. Create registration
	// --------------------------------------------------

	registrationStatus := registrationStatusForPrice(price)

	var registrationID int64

	err = tx.QueryRow(ctx, `
		INSERT INTO registrations (
			user_id,
			event_id,
			status,
			payment_status,
			created_at
		)
		VALUES (
			$1,
			$2,
			$3,
			'unpaid',
			NOW()
		)
		RETURNING id
	`,
		userID,
		eventID,
		registrationStatus,
	).Scan(&registrationID)

	if err != nil {
		return 0, err
	}

	// --------------------------------------------------
	// 6. Remove user from waitlist
	// --------------------------------------------------

	_, err = tx.Exec(ctx, `
		DELETE FROM waitlist
		WHERE id = $1
	`, waitlistID)

	if err != nil {
		return 0, err
	}

	// --------------------------------------------------
	// 7. Re-number remaining waitlist
	// --------------------------------------------------

	_, err = tx.Exec(ctx, `
		WITH ordered AS (
			SELECT
				id,
				ROW_NUMBER() OVER (
					ORDER BY position ASC, created_at ASC
				) AS new_position
			FROM waitlist
			WHERE event_id = $1
		)
		UPDATE waitlist AS w
		SET position = ordered.new_position
		FROM ordered
		WHERE w.id = ordered.id
	`,
		eventID,
	)

	if err != nil {
		return 0, err
	}

	// --------------------------------------------------
	// 8. Create outbox notification
	// --------------------------------------------------

	_, err = r.outboxRepo.Create(
		ctx,
		tx,
		"NOTIFICATION",
		"registration",
		strconv.FormatInt(registrationID, 10),
		map[string]interface{}{
			"user_id": userID,
			"type":    "WAITLIST_PROMOTED",
			"message": "You have been promoted from the waitlist and registered for the event.",
		},
	)

	if err != nil {
		return 0, err
	}

	// --------------------------------------------------
	// 9. Commit everything atomically
	// --------------------------------------------------

	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}

	return userID, nil
}

func isUniqueViolation(err error) bool {

	var pgErr *pgconn.PgError

	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}

	return false
}
