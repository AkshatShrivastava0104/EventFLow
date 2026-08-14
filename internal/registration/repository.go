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

	// Lock the event row.
	// This prevents concurrent registrations
	// from exceeding the event capacity.
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
			return 0, errors.New("event not found")
		}

		return 0, err
	}

	// Event must be published
	if status != "published" {
		return 0, errors.New(
			"registrations are only allowed for published events",
		)
	}

	// Check whether user already registered
	var existingID int64

	err = tx.QueryRow(ctx, `
		SELECT id
		FROM registrations
		WHERE user_id = $1
		  AND event_id = $2
	`, userID, eventID).Scan(&existingID)

	if err == nil {
		return 0, errors.New("user already registered")
	}

	if !errors.Is(err, pgx.ErrNoRows) {
		return 0, err
	}

	// Check capacity
	if capacity != nil {

		var registeredCount int

		err = tx.QueryRow(ctx, `
			SELECT COUNT(*)
			FROM registrations
			WHERE event_id = $1
			  AND status != 'cancelled'
		`, eventID).Scan(&registeredCount)

		if err != nil {
			return 0, err
		}

		if registeredCount >= *capacity {
			return 0, errors.New("event is full")
		}
	}

	// Create registration
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
		return 0, err
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}

	return registrationID, nil
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
) error {

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	result, err := r.db.Exec(ctx, `
		UPDATE registrations
		SET status = 'cancelled'
		WHERE id = $1
		  AND user_id = $2
		  AND status != 'cancelled'
	`,
		registrationID,
		userID,
	)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return errors.New(
			"registration not found or already cancelled",
		)
	}

	return nil
}