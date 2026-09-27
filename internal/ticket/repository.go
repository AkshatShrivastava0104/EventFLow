package ticket

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
		SELECT user_id, status
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
	// 5. Commit ticket + outbox atomically
	// --------------------------------------------------

	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}

	return ticketID, nil
}


func isUniqueViolation(err error) bool {

	var pgErr *pgconn.PgError

	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}

	return false
}