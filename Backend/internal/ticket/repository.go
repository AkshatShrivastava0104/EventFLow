package ticket

import (
	"context"
	"errors"
	"net/url"
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

func (r *Repository) CreateTicket(
	ctx context.Context,
	registrationID int64,
	ticketNumber string,
	qrCode string,
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
	// 1. Verify registration belongs to user
	// --------------------------------------------------

	var registrationUserID int64
	var registrationStatus string

	err = tx.QueryRow(ctx, `
		SELECT
			user_id,
			status
		FROM registrations
		WHERE id = $1
		FOR UPDATE
	`,
		registrationID,
	).Scan(
		&registrationUserID,
		&registrationStatus,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, apperrors.ErrRegistrationNotFound
		}

		return 0, err
	}

	if registrationUserID != userID {
		return 0, apperrors.ErrForbidden
	}

	if registrationStatus == "cancelled" {
		return 0, apperrors.ErrInvalidInput
	}

	// --------------------------------------------------
	// 2. Prevent duplicate ticket
	// --------------------------------------------------

	var existingTicketID int64

	err = tx.QueryRow(ctx, `
		SELECT id
		FROM tickets
		WHERE registration_id = $1
		LIMIT 1
	`,
		registrationID,
	).Scan(&existingTicketID)

	if err == nil {
		return 0, apperrors.ErrConflict
	}

	if !errors.Is(err, pgx.ErrNoRows) {
		return 0, err
	}

	// --------------------------------------------------
	// 3. Create ticket
	// --------------------------------------------------

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
			return 0, apperrors.ErrConflict
		}

		return 0, err
	}

	// --------------------------------------------------
	// 4. Create outbox notification
	// --------------------------------------------------

	_, err = r.outboxRepo.Create(
		ctx,
		tx,
		"NOTIFICATION",
		"ticket",
		strconv.FormatInt(ticketID, 10),
		map[string]interface{}{
			"user_id": userID,
			"type":    "TICKET_CREATED",
			"message": "Your event ticket has been created successfully.",
		},
	)

	if err != nil {
		return 0, err
	}

	// --------------------------------------------------
	// 5. Commit ticket + notification atomically
	// --------------------------------------------------

	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}

	return ticketID, nil
}

// GetMyTickets returns only valid tickets.
// A ticket whose registration has been cancelled is not returned.
func (r *Repository) GetMyTickets(
	ctx context.Context,
	userID int64,
) ([]MyTicket, error) {

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	rows, err := r.db.Query(ctx, `
		SELECT
			t.id,
			t.registration_id,
			t.qr_code,
			t.ticket_number,
			r.status,
			t.created_at,

			e.id,
			e.title,
			COALESCE(e.category, ''),
			COALESCE(e.venue, ''),
			COALESCE(e.address, ''),
			COALESCE(e.city, ''),
			COALESCE(e.country, ''),
			e.status,
			e.start_time,
			e.end_time,

			COALESCE(u.name, ''),
			COALESCE(u.email, ''),

			c.checked_in_at

		FROM tickets t

		INNER JOIN registrations r
			ON r.id = t.registration_id

		INNER JOIN events e
			ON e.id = r.event_id

		INNER JOIN users u
			ON u.id = r.user_id

		LEFT JOIN checkins c
			ON c.ticket_id = t.id

		WHERE r.user_id = $1
		  AND r.status != 'cancelled'

		ORDER BY
			e.start_time DESC NULLS LAST,
			t.created_at DESC
	`,
		userID,
	)

	if err != nil {
		return nil, err
	}

	defer rows.Close()

	tickets := make([]MyTicket, 0)

	for rows.Next() {
		var t MyTicket

		if err := rows.Scan(
			&t.ID,
			&t.RegistrationID,
			&t.QRCode,
			&t.TicketNumber,
			&t.RegistrationStatus,
			&t.CreatedAt,

			&t.EventID,
			&t.EventTitle,
			&t.EventCategory,
			&t.EventVenue,
			&t.EventAddress,
			&t.EventCity,
			&t.EventCountry,
			&t.EventStatus,
			&t.EventStart,
			&t.EventEnd,

			&t.AttendeeName,
			&t.AttendeeEmail,

			&t.CheckedInAt,
		); err != nil {
			return nil, err
		}

		t.CheckedIn = t.CheckedInAt != nil

		// Generate the actual QR image URL from the stored QR payload.
		t.QRCodeURL = generateQRCodeURL(t.QRCode)

		tickets = append(tickets, t)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return tickets, nil
}

// GetTicketByID returns one valid ticket belonging to the authenticated user.
//
// A ticket is considered invalid when its registration has been cancelled.
// Users can only access their own tickets.
func (r *Repository) GetTicketByID(
	ctx context.Context,
	ticketID int64,
	userID int64,
) (*MyTicket, error) {

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var ticket MyTicket

	err := r.db.QueryRow(ctx, `
		SELECT
			t.id,
			t.registration_id,
			t.qr_code,
			t.ticket_number,
			r.status,
			t.created_at,

			e.id,
			e.title,
			COALESCE(e.category, ''),
			COALESCE(e.venue, ''),
			COALESCE(e.address, ''),
			COALESCE(e.city, ''),
			COALESCE(e.country, ''),
			e.status,
			e.start_time,
			e.end_time,

			COALESCE(u.name, ''),
			COALESCE(u.email, ''),

			c.checked_in_at

		FROM tickets t

		INNER JOIN registrations r
			ON r.id = t.registration_id

		INNER JOIN events e
			ON e.id = r.event_id

		INNER JOIN users u
			ON u.id = r.user_id

		LEFT JOIN checkins c
			ON c.ticket_id = t.id

		WHERE t.id = $1
		  AND r.user_id = $2
		  AND r.status != 'cancelled'
	`,
		ticketID,
		userID,
	).Scan(
		&ticket.ID,
		&ticket.RegistrationID,
		&ticket.QRCode,
		&ticket.TicketNumber,
		&ticket.RegistrationStatus,
		&ticket.CreatedAt,

		&ticket.EventID,
		&ticket.EventTitle,
		&ticket.EventCategory,
		&ticket.EventVenue,
		&ticket.EventAddress,
		&ticket.EventCity,
		&ticket.EventCountry,
		&ticket.EventStatus,
		&ticket.EventStart,
		&ticket.EventEnd,

		&ticket.AttendeeName,
		&ticket.AttendeeEmail,

		&ticket.CheckedInAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperrors.ErrTicketNotFound
		}

		return nil, err
	}

	ticket.CheckedIn = ticket.CheckedInAt != nil

	// Generate the actual QR image URL from the stored QR payload.
	ticket.QRCodeURL = generateQRCodeURL(ticket.QRCode)

	return &ticket, nil
}

// generateQRCodeURL converts the EventFlow QR payload into
// a QuickChart QR image URL.
//
// The QR payload itself remains stored in the database.
// QuickChart is only responsible for rendering that payload
// as an actual QR image.
func generateQRCodeURL(qrCode string) string {
	return "https://quickchart.io/qr?text=" +
		url.QueryEscape(qrCode) +
		"&size=500&format=png"
}

func isUniqueViolation(err error) bool {

	var pgErr *pgconn.PgError

	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}

	return false
}