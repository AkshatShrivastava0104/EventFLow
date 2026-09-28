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

// OwnerWaitlistItem is the platform-owner view of a waitlist entry.
type OwnerWaitlistItem struct {
	ID                  int64
	UserID              int64
	UserName            string
	UserEmail           string
	EventID             int64
	EventTitle          string
	OrganizationID      int64
	OrganizationName    string
	Position            int
	CreatedAt           time.Time
	EventCapacity       *int
	RegisteredCount     int
	AvailableSpots      *int
	EventStartTime      *time.Time
	EventEndTime        *time.Time
	EventStatus         string
	RegistrationStatus  string
	HasActiveRegistration bool
}

// AddToWaitlist adds a user to the end of an event's waitlist.
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

	if !errors.Is(err, pgx.ErrNoRows) {
		return 0, err
	}

	// If the user is already waiting, the unique constraint should
	// normally catch this. We still check explicitly for a clean flow.
	var existingWaitlistID int64

	err = tx.QueryRow(ctx, `
		SELECT id
		FROM waitlist
		WHERE user_id = $1
		  AND event_id = $2
	`, userID, eventID).Scan(&existingWaitlistID)

	if err == nil {
		return 0, apperrors.ErrAlreadyWaitlisted
	}

	if !errors.Is(err, pgx.ErrNoRows) {
		return 0, err
	}

	var position int

	err = tx.QueryRow(ctx, `
		SELECT COALESCE(MAX(position), 0) + 1
		FROM waitlist
		WHERE event_id = $1
	`, eventID).Scan(&position)

	if err != nil {
		return 0, err
	}

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

// ListOwnerWaitlist returns platform-wide waitlist data for the owner console.
func (r *Repository) ListOwnerWaitlist(
	ctx context.Context,
	search string,
	eventID int64,
	organizationID int64,
	sort string,
	page int,
	limit int,
) ([]OwnerWaitlistItem, int, error) {

	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	if page < 1 {
		page = 1
	}

	if limit < 1 {
		limit = 20
	}

	if limit > 100 {
		limit = 100
	}

	offset := (page - 1) * limit

	search = normalizeSearch(search)

	orderBy := ownerWaitlistOrderBy(sort)

	const baseWhere = `
		FROM waitlist w
		INNER JOIN users u
			ON u.id = w.user_id
		INNER JOIN events e
			ON e.id = w.event_id
		INNER JOIN organizations o
			ON o.id = e.organization_id
		LEFT JOIN LATERAL (
			SELECT
				r.status
			FROM registrations r
			WHERE r.user_id = w.user_id
			  AND r.event_id = w.event_id
			  AND r.status != 'cancelled'
			ORDER BY r.created_at DESC
			LIMIT 1
		) active_registration ON TRUE
		LEFT JOIN LATERAL (
			SELECT COUNT(*)::int AS registered_count
			FROM registrations r2
			WHERE r2.event_id = e.id
			  AND r2.status != 'cancelled'
		) registration_stats ON TRUE
		WHERE
			(
				$1 = ''
				OR u.name ILIKE '%' || $1 || '%'
				OR u.email ILIKE '%' || $1 || '%'
				OR e.title ILIKE '%' || $1 || '%'
				OR o.name ILIKE '%' || $1 || '%'
			)
			AND ($2 = 0 OR w.event_id = $2)
			AND ($3 = 0 OR e.organization_id = $3)
	`

	var total int

	err := r.db.QueryRow(
		ctx,
		`SELECT COUNT(*) `+baseWhere,
		search,
		eventID,
		organizationID,
	).Scan(&total)

	if err != nil {
		return nil, 0, err
	}

	rows, err := r.db.Query(
		ctx,
		`
		SELECT
			w.id,
			w.user_id,
			u.name,
			u.email,
			w.event_id,
			e.title,
			e.organization_id,
			o.name,
			w.position,
			w.created_at,
			e.capacity,
			COALESCE(registration_stats.registered_count, 0),
			CASE
				WHEN e.capacity IS NULL THEN NULL
				WHEN e.capacity - COALESCE(registration_stats.registered_count, 0) < 0 THEN 0
				ELSE e.capacity - COALESCE(registration_stats.registered_count, 0)
			END,
			e.start_time,
			e.end_time,
			e.status,
			COALESCE(active_registration.status, ''),
			CASE
				WHEN active_registration.status IS NULL THEN FALSE
				ELSE TRUE
			END
		`+baseWhere+`
		ORDER BY `+orderBy+`
		LIMIT $4
		OFFSET $5
		`,
		search,
		eventID,
		organizationID,
		limit,
		offset,
	)
	if err != nil {
		return nil, 0, err
	}

	defer rows.Close()

	items := make([]OwnerWaitlistItem, 0, limit)

	for rows.Next() {
		var item OwnerWaitlistItem

		err := rows.Scan(
			&item.ID,
			&item.UserID,
			&item.UserName,
			&item.UserEmail,
			&item.EventID,
			&item.EventTitle,
			&item.OrganizationID,
			&item.OrganizationName,
			&item.Position,
			&item.CreatedAt,
			&item.EventCapacity,
			&item.RegisteredCount,
			&item.AvailableSpots,
			&item.EventStartTime,
			&item.EventEndTime,
			&item.EventStatus,
			&item.RegistrationStatus,
			&item.HasActiveRegistration,
		)

		if err != nil {
			return nil, 0, err
		}

		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

// PromoteNextUser promotes the first person in the queue when capacity
// is available.
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

	if capacity != nil && activeRegistrations >= *capacity {
		if err := tx.Commit(ctx); err != nil {
			return 0, err
		}

		return 0, nil
	}

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
		_, err = tx.Exec(ctx, `
			DELETE FROM waitlist
			WHERE id = $1
		`, waitlistID)

		if err != nil {
			return 0, err
		}

		if err := r.renumberWaitlistTx(ctx, tx, eventID); err != nil {
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

	registrationStatus := registrationStatusForPrice(price)

	var paymentStatus string

	if price <= 0 {
		paymentStatus = "paid"
	} else {
		paymentStatus = "unpaid"
	}

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
		return 0, err
	}

	_, err = tx.Exec(ctx, `
		DELETE FROM waitlist
		WHERE id = $1
	`, waitlistID)

	if err != nil {
		return 0, err
	}

	if err := r.renumberWaitlistTx(ctx, tx, eventID); err != nil {
		return 0, err
	}

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

	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}

	return userID, nil
}

// PromoteUser promotes a specific waitlisted user.
//
// The user must be the current first eligible person in the queue.
// This keeps the queue fair and prevents an owner from bypassing
// the waitlist ordering accidentally.
func (r *Repository) PromoteUser(
	ctx context.Context,
	waitlistID int64,
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

	var eventID int64
	var userID int64
	var position int

	err = tx.QueryRow(ctx, `
		SELECT
			w.event_id,
			w.user_id,
			w.position
		FROM waitlist w
		WHERE w.id = $1
		FOR UPDATE
	`, waitlistID).Scan(
		&eventID,
		&userID,
		&position,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, errors.New("waitlist entry not found")
		}

		return 0, err
	}

	var firstPosition int

	err = tx.QueryRow(ctx, `
		SELECT position
		FROM waitlist
		WHERE event_id = $1
		ORDER BY position ASC, created_at ASC
		LIMIT 1
		FOR UPDATE
	`, eventID).Scan(&firstPosition)

	if err != nil {
		return 0, err
	}

	if position != firstPosition {
		return 0, errors.New("only the first waitlisted attendee can be promoted")
	}

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

	if capacity != nil && activeRegistrations >= *capacity {
		return 0, errors.New("event is still full")
	}

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
		_, err = tx.Exec(ctx, `
			DELETE FROM waitlist
			WHERE id = $1
		`, waitlistID)

		if err != nil {
			return 0, err
		}

		if err := r.renumberWaitlistTx(ctx, tx, eventID); err != nil {
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

	registrationStatus := registrationStatusForPrice(price)

	paymentStatus := "unpaid"
	if price <= 0 {
		paymentStatus = "paid"
	}

	var registrationID int64

	err = tx.QueryRow(ctx, `
		INSERT INTO registrations (
			user_id,
			event_id,
			status,
			payment_status,
			created_at
		)
		VALUES ($1, $2, $3, $4, NOW())
		RETURNING id
	`,
		userID,
		eventID,
		registrationStatus,
		paymentStatus,
	).Scan(&registrationID)

	if err != nil {
		return 0, err
	}

	_, err = tx.Exec(ctx, `
		DELETE FROM waitlist
		WHERE id = $1
	`, waitlistID)

	if err != nil {
		return 0, err
	}

	if err := r.renumberWaitlistTx(ctx, tx, eventID); err != nil {
		return 0, err
	}

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

	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}

	return userID, nil
}

// RemoveFromWaitlist removes a waitlist entry.
func (r *Repository) RemoveFromWaitlist(
	ctx context.Context,
	waitlistID int64,
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

	var eventID int64

	err = tx.QueryRow(ctx, `
		SELECT event_id
		FROM waitlist
		WHERE id = $1
		FOR UPDATE
	`, waitlistID).Scan(&eventID)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("waitlist entry not found")
		}

		return err
	}

	commandTag, err := tx.Exec(ctx, `
		DELETE FROM waitlist
		WHERE id = $1
	`, waitlistID)

	if err != nil {
		return err
	}

	if commandTag.RowsAffected() == 0 {
		return errors.New("waitlist entry not found")
	}

	if err := r.renumberWaitlistTx(ctx, tx, eventID); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return err
	}

	return nil
}

// renumberWaitlistTx keeps queue positions contiguous after a promotion
// or removal.
func (r *Repository) renumberWaitlistTx(
	ctx context.Context,
	tx pgx.Tx,
	eventID int64,
) error {

	_, err := tx.Exec(ctx, `
		WITH ordered AS (
			SELECT
				id,
				ROW_NUMBER() OVER (
					ORDER BY position ASC, created_at ASC, id ASC
				) AS new_position
			FROM waitlist
			WHERE event_id = $1
		)
		UPDATE waitlist AS w
		SET position = ordered.new_position
		FROM ordered
		WHERE w.id = ordered.id
	`, eventID)

	return err
}

func registrationStatusForPrice(price float64) string {
	if price <= 0 {
		return "registered"
	}

	return "pending"
}

func normalizeSearch(value string) string {
	value = stringTrimSpace(value)

	if len(value) > 100 {
		value = value[:100]
	}

	return value
}

func stringTrimSpace(value string) string {
	start := 0
	end := len(value)

	for start < end {
		switch value[start] {
		case ' ', '\t', '\n', '\r':
			start++
		default:
			goto trimEnd
		}
	}

trimEnd:
	for end > start {
		switch value[end-1] {
		case ' ', '\t', '\n', '\r':
			end--
		default:
			break
		}
	}

	return value[start:end]
}

func ownerWaitlistOrderBy(sort string) string {
	switch sort {
	case "newest":
		return "w.created_at DESC, w.id DESC"
	case "oldest":
		return "w.created_at ASC, w.id ASC"
	case "position_desc":
		return "w.position DESC, w.created_at ASC, w.id ASC"
	case "attendee_asc":
		return "u.name ASC, w.id ASC"
	case "attendee_desc":
		return "u.name DESC, w.id DESC"
	case "event_asc":
		return "e.title ASC, w.position ASC, w.id ASC"
	case "event_desc":
		return "e.title DESC, w.position ASC, w.id ASC"
	default:
		return "w.position ASC, w.created_at ASC, w.id ASC"
	}
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError

	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}

	return false
}