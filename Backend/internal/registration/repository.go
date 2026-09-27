package registration

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
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
	var price float64

	err = tx.QueryRow(ctx, `
		SELECT
			capacity,
			status,
			registration_deadline,
			COALESCE(price, 0)
		FROM events
		WHERE id = $1
		FOR UPDATE
	`, eventID).Scan(
		&capacity,
		&status,
		&registrationDeadline,
		&price,
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
	// 4. ONE ACTIVE REGISTRATION PER USER PER EVENT
	//
	// Cancelled registrations do NOT block a new
	// registration.
	// --------------------------------------------------

	var existingRegistrationID int64

	err = tx.QueryRow(ctx, `
		SELECT id
		FROM registrations
		WHERE user_id = $1
		  AND event_id = $2
		  AND status != 'cancelled'
		LIMIT 1
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
		LIMIT 1
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
				if isUniqueViolation(err) {
					return nil, apperrors.ErrAlreadyWaitlisted
				}

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
			// 9. Commit waitlist
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
	// 10. Determine registration/payment status
	//
	// FREE EVENT:
	// price == 0
	// -> registered
	// -> unpaid
	// -> ticket generated
	//
	// PAID EVENT:
	// price > 0
	// -> paymentSuccessful() is checked
	//
	// payment success:
	// -> registered
	// -> paid
	// -> ticket generated
	//
	// payment not successful:
	// -> pending
	// -> unpaid
	// -> NO ticket
	// --------------------------------------------------

	paymentCompleted := true

	if price > 0 {
		paymentCompleted = paymentSuccessful()
	}

	registrationStatus, paymentStatus := registrationStatusForPayment(
		price,
		paymentCompleted,
	)

	// --------------------------------------------------
	// 11. Create registration
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
			$3,
			$4,
			NOW()
		)
		RETURNING id
	`,
		userID,
		eventID,
		registrationStatus,
		paymentStatus,
	).Scan(&registrationID)

	if err != nil {
		if isUniqueViolation(err) {
			return nil, apperrors.ErrAlreadyRegistered
		}

		return nil, err
	}

	// --------------------------------------------------
	// 12. Paid event but payment is NOT completed
	//
	// Registration remains pending.
	// No ticket is generated until payment succeeds.
	// --------------------------------------------------

	if price > 0 && !paymentCompleted {
		_, err = r.outboxRepo.Create(
			ctx,
			tx,
			"NOTIFICATION",
			"registration",
			strconv.FormatInt(registrationID, 10),
			map[string]interface{}{
				"user_id":         userID,
				"type":            "REGISTRATION_PAYMENT_PENDING",
				"message":         "Your registration is pending payment.",
				"registration_id": registrationID,
			},
		)

		if err != nil {
			return nil, err
		}

		if err := tx.Commit(ctx); err != nil {
			return nil, err
		}

		return &RegisterResult{
			Status:         "pending",
			RegistrationID: &registrationID,
		}, nil
	}

	// --------------------------------------------------
	// 13. Generate ticket
	//
	// Ticket is generated only when:
	//
	// FREE:
	// registered + unpaid
	//
	// PAID:
	// registered + paid
	// --------------------------------------------------

	ticketNumber, err := generateTicketNumber()
	if err != nil {
		return nil, err
	}

	qrCode, err := generateQRCode(registrationID)
	if err != nil {
		return nil, err
	}

	var ticketID int64

	err = tx.QueryRow(ctx, `
		INSERT INTO tickets (
			registration_id,
			qr_code,
			ticket_number,
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
		registrationID,
		qrCode,
		ticketNumber,
	).Scan(&ticketID)

	if err != nil {
		if isUniqueViolation(err) {
			return nil, apperrors.ErrConflict
		}

		return nil, err
	}

	// --------------------------------------------------
	// 14. Registration notification
	// --------------------------------------------------

	_, err = r.outboxRepo.Create(
		ctx,
		tx,
		"NOTIFICATION",
		"registration",
		strconv.FormatInt(registrationID, 10),
		map[string]interface{}{
			"user_id":         userID,
			"type":            "REGISTRATION_CREATED",
			"message":         "Your registration was created successfully.",
			"registration_id": registrationID,
			"ticket_id":       ticketID,
		},
	)

	if err != nil {
		return nil, err
	}

	// --------------------------------------------------
	// 15. Ticket notification
	// --------------------------------------------------

	_, err = r.outboxRepo.Create(
		ctx,
		tx,
		"NOTIFICATION",
		"ticket",
		strconv.FormatInt(ticketID, 10),
		map[string]interface{}{
			"user_id":    userID,
			"type":       "TICKET_CREATED",
			"message":    "Your event ticket has been created successfully.",
			"ticket_id":  ticketID,
			"ticket_num": ticketNumber,
		},
	)

	if err != nil {
		return nil, err
	}

	// --------------------------------------------------
	// 16. Commit registration + ticket + notifications
	// atomically
	// --------------------------------------------------

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &RegisterResult{
		Status:         "registered",
		RegistrationID: &registrationID,
	}, nil
}

// --------------------------------------------------
// Dummy payment function
//
// For now:
// false = payment not completed
// true  = payment completed
//
// Later replace this function with actual payment
// gateway verification / webhook logic.
// --------------------------------------------------

func paymentSuccessful() bool {
	return false
}

func registrationStatusForPayment(price float64, paymentCompleted bool) (string, string) {
	if price <= 0 {
		return "registered", "unpaid"
	}

	if paymentCompleted {
		return "registered", "paid"
	}

	return "pending", "unpaid"
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
	`,
		userID,
	).Scan(&total)

	if err != nil {
		return nil, 0, err
	}

	// --------------------------------------------------
	// Registration + User + Event details
	//
	// Event data is returned directly with registration
	// so frontend can render:
	// - title
	// - category
	// - cover image
	// - venue
	// - address
	// - city
	// - country
	// - date/time
	// - price
	// --------------------------------------------------

	rows, err := r.db.Query(ctx, `
		SELECT
			r.id,
			r.user_id,
			r.event_id,
			COALESCE(u.name, ''),
			COALESCE(u.email, ''),
			r.status,
			r.payment_status,
			r.created_at,

			e.id,
			COALESCE(e.title, ''),
			COALESCE(e.slug, ''),
			COALESCE(e.description, ''),
			COALESCE(e.venue, ''),
			COALESCE(e.address, ''),
			COALESCE(e.city, ''),
			COALESCE(e.country, ''),
			COALESCE(e.category, ''),
			COALESCE(e.cover_image, ''),
			COALESCE(e.featured, false),
			COALESCE(e.visibility, ''),
			COALESCE(e.status, ''),
			e.capacity,
			e.start_time,
			e.end_time,
			COALESCE(e.price, 0)
		FROM registrations r
		INNER JOIN users u
			ON u.id = r.user_id
		INNER JOIN events e
			ON e.id = r.event_id
		WHERE r.user_id = $1
		ORDER BY r.created_at DESC
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

	registrations := make([]Registration, 0)

	for rows.Next() {
		var registration Registration

		registration.Event = &RegistrationEvent{}

		err := rows.Scan(
			&registration.ID,
			&registration.UserID,
			&registration.EventID,
			&registration.UserName,
			&registration.UserEmail,
			&registration.Status,
			&registration.PaymentStatus,
			&registration.CreatedAt,

			&registration.Event.ID,
			&registration.Event.Title,
			&registration.Event.Slug,
			&registration.Event.Description,
			&registration.Event.Venue,
			&registration.Event.Address,
			&registration.Event.City,
			&registration.Event.Country,
			&registration.Event.Category,
			&registration.Event.CoverImage,
			&registration.Event.Featured,
			&registration.Event.Visibility,
			&registration.Event.Status,
			&registration.Event.Capacity,
			&registration.Event.StartTime,
			&registration.Event.EndTime,
			&registration.Event.Price,
		)

		if err != nil {
			return nil, 0, err
		}

		registration.Event.CoverMediaURL =
			registration.Event.CoverImage

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

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return 0, err
	}

	defer func() {
		_ = tx.Rollback(ctx)
	}()

	// --------------------------------------------------
	// 1. Cancel registration
	// --------------------------------------------------

	var eventID int64

	err = tx.QueryRow(ctx, `
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

	// --------------------------------------------------
	// 2. Ticket becomes invalid automatically
	//
	// The ticket remains as historical data, but every
	// ticket query/check-in must respect registration
	// status.
	// --------------------------------------------------

	var ticketID int64

	err = tx.QueryRow(ctx, `
		SELECT id
		FROM tickets
		WHERE registration_id = $1
		LIMIT 1
	`,
		registrationID,
	).Scan(&ticketID)

	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return 0, err
	}

	// --------------------------------------------------
	// 3. Create cancellation notification
	// --------------------------------------------------

	metadata := map[string]interface{}{
		"user_id":         userID,
		"registration_id": registrationID,
	}

	if ticketID > 0 {
		metadata["ticket_id"] = ticketID
	}

	_, err = r.outboxRepo.Create(
		ctx,
		tx,
		"NOTIFICATION",
		"registration",
		strconv.FormatInt(registrationID, 10),
		map[string]interface{}{
			"user_id":         userID,
			"type":            "REGISTRATION_CANCELLED",
			"message":         "Your event registration has been cancelled.",
			"registration_id": registrationID,
			"ticket_id":       ticketID,
		},
	)

	if err != nil {
		return 0, err
	}

	_ = metadata

	// --------------------------------------------------
	// 4. Commit cancellation
	// --------------------------------------------------

	if err := tx.Commit(ctx); err != nil {
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
	`,
		eventID,
	).Scan(&total)

	if err != nil {
		return nil, 0, err
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			r.id,
			r.user_id,
			COALESCE(u.name, ''),
			COALESCE(u.email, ''),
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

	attendees := make([]RegistrationAttendee, 0)

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

		attendees = append(
			attendees,
			attendee,
		)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	return attendees, total, nil
}

func generateTicketNumber() (string, error) {
	b := make([]byte, 8)

	if _, err := rand.Read(b); err != nil {
		return "", err
	}

	return fmt.Sprintf(
		"EVT-%d-%s",
		time.Now().Unix(),
		hex.EncodeToString(b),
	), nil
}

func generateQRCode(registrationID int64) (string, error) {
	b := make([]byte, 16)

	if _, err := rand.Read(b); err != nil {
		return "", err
	}

	return fmt.Sprintf(
		"eventflow:ticket:%d:%s",
		registrationID,
		hex.EncodeToString(b),
	), nil
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError

	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}

	return false
}
