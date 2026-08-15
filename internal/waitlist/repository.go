package waitlist

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
		return 0, errors.New(
			"only published events can have a waitlist",
		)
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
		return 0, errors.New(
			"user is already registered for this event",
		)
	}

	if !errors.Is(err, pgx.ErrNoRows) {
		return 0, err
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
		return 0, err
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}

	return waitlistID, nil
}




func (r *Repository) PromoteNextUser(
	ctx context.Context,
	eventID int64,
) error {

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback(ctx)
	}()

	// --------------------------------------------------
	// 1. Lock the event row
	// --------------------------------------------------

	err = tx.QueryRow(ctx, `
		SELECT id
		FROM events
		WHERE id = $1
		FOR UPDATE
	`, eventID).Scan(&eventID)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("event not found")
		}

		return err
	}

	// --------------------------------------------------
	// 2. Get the first user from waitlist
	// --------------------------------------------------

	var waitlistID int64
	var userID int64

	err = tx.QueryRow(ctx, `
		SELECT id, user_id
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

		// Nobody is waiting.
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}

		return err
	}

	// --------------------------------------------------
	// 3. Create registration
	// --------------------------------------------------

	_, err = tx.Exec(ctx, `
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
			'pending',
			'unpaid',
			NOW()
		)
	`,
		userID,
		eventID,
	)

	if err != nil {
		return err
	}

	// --------------------------------------------------
	// 4. Remove user from waitlist
	// --------------------------------------------------

	_, err = tx.Exec(ctx, `
		DELETE FROM waitlist
		WHERE id = $1
	`, waitlistID)

	if err != nil {
		return err
	}

	// --------------------------------------------------
	// 5. Re-number remaining waitlist positions
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
		return err
	}

	// --------------------------------------------------
	// 6. Commit
	// --------------------------------------------------

	if err := tx.Commit(ctx); err != nil {
		return err
	}

	return nil
}