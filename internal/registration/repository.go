package registration

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


func (r *Repository) RegisterUser(
	ctx context.Context,
	eventID int64,
	userID int64,
) (*RegisterResult, error) {

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}

	defer func() {
		_ = tx.Rollback(ctx)
	}()

	// --------------------------------------------------
	// 1. Lock event
	// --------------------------------------------------

	var capacity *int
	var status string

	err = tx.QueryRow(ctx, `
		SELECT capacity, status
		FROM events
		WHERE id = $1
		FOR UPDATE
	`, eventID).Scan(
		&capacity,
		&status,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("event not found")
		}

		return nil, err
	}

	// --------------------------------------------------
	// 2. Event must be published
	// --------------------------------------------------

	if status != "published" {
		return nil, errors.New(
			"registrations are only allowed for published events",
		)
	}

	// --------------------------------------------------
	// 3. Check active registration
	// --------------------------------------------------

	var existingRegistrationID int64

	err = tx.QueryRow(ctx, `
		SELECT id
		FROM registrations
		WHERE user_id = $1
		  AND event_id = $2
		  AND status != 'cancelled'
	`, userID, eventID).Scan(&existingRegistrationID)

	if err == nil {
		return nil, errors.New("user already registered")
	}

	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	// --------------------------------------------------
	// 4. Check existing waitlist entry
	// --------------------------------------------------

	var existingWaitlistID int64

	err = tx.QueryRow(ctx, `
		SELECT id
		FROM waitlist
		WHERE user_id = $1
		  AND event_id = $2
	`, userID, eventID).Scan(&existingWaitlistID)

	if err == nil {
		return nil, errors.New("user already on waitlist")
	}

	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	// --------------------------------------------------
	// 5. Check capacity
	// --------------------------------------------------

	if capacity != nil {

		var registeredCount int

		err = tx.QueryRow(ctx, `
			SELECT COUNT(*)
			FROM registrations
			WHERE event_id = $1
			  AND status != 'cancelled'
		`, eventID).Scan(&registeredCount)

		if err != nil {
			return nil, err
		}

		// --------------------------------------------------
		// 6. Event full → automatically waitlist user
		// --------------------------------------------------

		if registeredCount >= *capacity {

			var position int

			err = tx.QueryRow(ctx, `
				SELECT COALESCE(MAX(position), 0) + 1
				FROM waitlist
				WHERE event_id = $1
			`, eventID).Scan(&position)

			if err != nil {
				return nil, err
			}

			var waitlistID int64

			err = tx.QueryRow(ctx, `
				INSERT INTO waitlist (
					user_id,
					event_id,
					position,
					created_at
				)
				VALUES (
					$1,
					$2,
					$3,
					NOW()
				)
				RETURNING id
			`,
				userID,
				eventID,
				position,
			).Scan(&waitlistID)

			if err != nil {
				return nil, err
			}

			if err := tx.Commit(ctx); err != nil {
				return nil, err
			}

			return &RegisterResult{
				Status:     "waitlisted",
				WaitlistID: &waitlistID,
			}, nil
		}
	}

	// --------------------------------------------------
	// 7. Create registration
	// --------------------------------------------------

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
			'pending',
			'unpaid',
			NOW()
		)
		RETURNING id
	`,
		userID,
		eventID,
	).Scan(&registrationID)

	if err != nil {
		return nil, err
	}

	// --------------------------------------------------
	// 8. Commit
	// --------------------------------------------------

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &RegisterResult{
		Status:         "registered",
		RegistrationID: &registrationID,
	}, nil
}









func (r *Repository) GetRegistrationsByUserID(
	ctx context.Context,
	userID int64,
) ([]Registration, error) {

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	rows, err := r.db.Query(ctx, `
		SELECT
			id,
			user_id,
			event_id,
			status,
			payment_status,
			created_at
		FROM registrations
		WHERE user_id = $1
		ORDER BY created_at DESC
	`, userID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var registrations []Registration

	for rows.Next() {

		var registration Registration

		err := rows.Scan(
			&registration.ID,
			&registration.UserID,
			&registration.EventID,
			&registration.Status,
			&registration.PaymentStatus,
			&registration.CreatedAt,
		)

		if err != nil {
			return nil, err
		}

		registrations = append(
			registrations,
			registration,
		)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return registrations, nil
}


func (r *Repository) CancelRegistration(
	ctx context.Context,
	registrationID int64,
	userID int64,
) (int64, error) {

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var eventID int64

	err := r.db.QueryRow(ctx, `
		UPDATE registrations
		SET status = 'cancelled'
		WHERE id = $1
		  AND user_id = $2
		  AND status != 'cancelled'
		RETURNING event_id
	`,
		registrationID,
		userID,
	).Scan(&eventID)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, errors.New(
				"registration not found or already cancelled",
			)
		}

		return 0, err
	}

	return eventID, nil
}