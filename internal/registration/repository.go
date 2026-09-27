package registration

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
	db        *pgxpool.Pool
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
	// 1. Lock event and fetch event details
	// --------------------------------------------------

	var capacity *int
	var status string
	var registrationDeadline *time.Time

	err = tx.QueryRow(ctx, `
		SELECT
			capacity,
			status,
			registration_deadline
		FROM events
		WHERE id = $1
		FOR UPDATE
	`, eventID).Scan(
		&capacity,
		&status,
		&registrationDeadline,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperrors.ErrEventNotFound
		}

		return nil, err
	}

	// --------------------------------------------------
	// 2. Event must be published
	// --------------------------------------------------

	if status != "published" {
		return nil, apperrors.ErrEventNotPublished
	}

	// --------------------------------------------------
	// 3. Registration deadline
	// --------------------------------------------------

	if registrationDeadline != nil &&
		time.Now().After(*registrationDeadline) {

		return nil, apperrors.ErrRegistrationDeadlinePassed
	}

	// --------------------------------------------------
	// 4. Check active registration
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
		return nil, apperrors.ErrAlreadyRegistered
	}

	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	// --------------------------------------------------
	// 5. Check existing waitlist entry
	// --------------------------------------------------

	var existingWaitlistID int64

	err = tx.QueryRow(ctx, `
		SELECT id
		FROM waitlist
		WHERE user_id = $1
		  AND event_id = $2
	`,
		userID,
		eventID,
	).Scan(&existingWaitlistID)

	if err == nil {
		return nil, apperrors.ErrAlreadyWaitlisted
	}

	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	// --------------------------------------------------
	// 6. Check capacity
	// --------------------------------------------------

	if capacity != nil {

		var registeredCount int

		err = tx.QueryRow(ctx, `
			SELECT COUNT(*)
			FROM registrations
			WHERE event_id = $1
			  AND status != 'cancelled'
		`,
			eventID,
		).Scan(&registeredCount)

		if err != nil {
			return nil, err
		}

		// --------------------------------------------------
		// 7. Event full -> waitlist
		// --------------------------------------------------

		if registeredCount >= *capacity {

			var position int

			err = tx.QueryRow(ctx, `
				SELECT COALESCE(MAX(position), 0) + 1
				FROM waitlist
				WHERE event_id = $1
			`,
				eventID,
			).Scan(&position)

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

			// --------------------------------------------------
			// 8. Create WAITLISTED outbox event
			// --------------------------------------------------

			_, err = r.outboxRepo.Create(
				ctx,
				tx,
				"NOTIFICATION",
				"waitlist",
				strconv.FormatInt(waitlistID, 10),
				map[string]interface{}{
					"user_id": userID,
					"type":    "WAITLISTED",
					"message": "The event is full. You have been added to the waitlist.",
				},
			)

			if err != nil {
				return nil, err
			}

			// --------------------------------------------------
			// 9. Commit everything together
			// --------------------------------------------------

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
	// 10. Create registration
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
		if isUniqueViolation(err) {
			return nil, apperrors.ErrAlreadyRegistered
		}

		return nil, err
	}

	// --------------------------------------------------
	// 11. Create REGISTRATION_CREATED outbox event
	// --------------------------------------------------

	_, err = r.outboxRepo.Create(
		ctx,
		tx,
		"NOTIFICATION",
		"registration",
		strconv.FormatInt(registrationID, 10),
		map[string]interface{}{
			"user_id": userID,
			"type":    "REGISTRATION_CREATED",
			"message": "Your registration was created successfully.",
		},
	)

	if err != nil {
		return nil, err
	}

	// --------------------------------------------------
	// 12. Commit registration + outbox together
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
	page int,
	limit int,
) ([]Registration, int, error) {

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	offset := (page - 1) * limit

	var total int

	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM registrations
		WHERE user_id = $1
	`, userID).Scan(&total)

	if err != nil {
		return nil, 0, err
	}

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
		LIMIT $2
		OFFSET $3
	`,
		userID,
		limit,
		offset,
	)

	if err != nil {
		return nil, 0, err
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
			return nil, 0, err
		}

		registrations = append(
			registrations,
			registration,
		)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	return registrations, total, nil
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
			return 0, apperrors.ErrRegistrationNotFound
		}

		return 0, err
	}

	return eventID, nil
}





func (r *Repository) GetEventRegistrations(
	ctx context.Context,
	eventID int64,
	page int,
	limit int,
) ([]RegistrationAttendee, int, error) {

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	offset := (page - 1) * limit

	var total int

	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM registrations
		WHERE event_id = $1
		  AND status != 'cancelled'
	`, eventID).Scan(&total)

	if err != nil {
		return nil, 0, err
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			r.id,
			r.user_id,
			u.name,
			u.email,
			r.status,
			r.payment_status,
			r.created_at
		FROM registrations r
		INNER JOIN users u
			ON u.id = r.user_id
		WHERE r.event_id = $1
		  AND r.status != 'cancelled'
		ORDER BY r.created_at ASC
		LIMIT $2
		OFFSET $3
	`,
		eventID,
		limit,
		offset,
	)

	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var attendees []RegistrationAttendee

	for rows.Next() {

		var attendee RegistrationAttendee

		err := rows.Scan(
			&attendee.RegistrationID,
			&attendee.UserID,
			&attendee.Name,
			&attendee.Email,
			&attendee.Status,
			&attendee.PaymentStatus,
			&attendee.CreatedAt,
		)

		if err != nil {
			return nil, 0, err
		}

		attendees = append(attendees, attendee)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	return attendees, total, nil
}


func isUniqueViolation(err error) bool {

	var pgErr *pgconn.PgError

	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}

	return false
}