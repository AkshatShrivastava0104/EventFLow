package event

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"time"

	apperrors "github.com/AkshatShrivastava0104/EventFlow/internal/errors"
	"github.com/AkshatShrivastava0104/EventFlow/internal/outbox"
	"github.com/jackc/pgx/v5"
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

func (r *Repository) CreateEvent(
	ctx context.Context,
	event *Event,
) (int64, error) {

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var eventID int64

	err := r.db.QueryRow(ctx, `
		INSERT INTO events (
			organization_id,
			title,
			description,
			venue,
			capacity,
			registration_deadline,
			start_time,
			end_time,
			status,
			created_at,
			updated_at
		)
		VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8,
			'draft',
			NOW(),
			NOW()
		)
		RETURNING id
	`,
		event.OrganizationID,
		event.Title,
		event.Description,
		event.Venue,
		event.Capacity,
		event.RegistrationDeadline,
		event.StartTime,
		event.EndTime,
	).Scan(&eventID)

	if err != nil {
		return 0, err
	}

	return eventID, nil
}


func (r *Repository) GetEventsByOrganizationID(
	ctx context.Context,
	organizationID int64,
	page int,
	limit int,
) ([]Event, int, error) {

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	offset := (page - 1) * limit

	var total int

	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM events
		WHERE organization_id = $1
	`, organizationID).Scan(&total)

	if err != nil {
		return nil, 0, err
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			id,
			organization_id,
			title,
			description,
			venue,
			capacity,
			registration_deadline,
			start_time,
			end_time,
			status,
			created_at,
			updated_at
		FROM events
		WHERE organization_id = $1
		ORDER BY created_at DESC
		LIMIT $2
		OFFSET $3
	`,
		organizationID,
		limit,
		offset,
	)

	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var events []Event

	for rows.Next() {

		var event Event

		err := rows.Scan(
			&event.ID,
			&event.OrganizationID,
			&event.Title,
			&event.Description,
			&event.Venue,
			&event.Capacity,
			&event.RegistrationDeadline,
			&event.StartTime,
			&event.EndTime,
			&event.Status,
			&event.CreatedAt,
			&event.UpdatedAt,
		)

		if err != nil {
			return nil, 0, err
		}

		events = append(events, event)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	return events, total, nil
}


func (r *Repository) GetEventByID(
	ctx context.Context,
	eventID int64,
) (*Event, error) {

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var event Event

	err := r.db.QueryRow(ctx, `
		SELECT
			id,
			organization_id,
			title,
			description,
			venue,
			capacity,
			registration_deadline,
			start_time,
			end_time,
			status,
			created_at,
			updated_at
		FROM events
		WHERE id = $1
	`, eventID).Scan(
		&event.ID,
		&event.OrganizationID,
		&event.Title,
		&event.Description,
		&event.Venue,
		&event.Capacity,
		&event.RegistrationDeadline,
		&event.StartTime,
		&event.EndTime,
		&event.Status,
		&event.CreatedAt,
		&event.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &event, nil
}



func (r *Repository) UpdateEvent(
	ctx context.Context,
	eventID int64,
	req UpdateEventRequest,
) error {

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	_, err := r.db.Exec(ctx, `
		UPDATE events
		SET
			title = $1,
			description = $2,
			venue = $3,
			capacity = $4,
			registration_deadline = $5,
			start_time = $6,
			end_time = $7,
			updated_at = NOW()
		WHERE id = $8
	`,
		req.Title,
		req.Description,
		req.Venue,
		req.Capacity,
		req.RegistrationDeadline,
		req.StartTime,
		req.EndTime,
		eventID,
	)

	return err
}



func (r *Repository) DeleteEvent(
	ctx context.Context,
	eventID int64,
) error {

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	result, err := r.db.Exec(ctx, `
		DELETE FROM events
		WHERE id = $1
	`, eventID)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return errors.New("event not found")
	}

	return nil
}


func (r *Repository) PublishEvent(
	ctx context.Context,
	eventID int64,
) error {

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	result, err := r.db.Exec(ctx, `
		UPDATE events
		SET
			status = 'published',
			updated_at = NOW()
		WHERE id = $1
		  AND status = 'draft'
	`,
		eventID,
	)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return errors.New(
			"event not found or cannot be published",
		)
	}

	return nil
}



func (r *Repository) CancelEvent(
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

	// Lock event and cancel it.
	result, err := tx.Exec(ctx, `
		UPDATE events
		SET
			status = 'cancelled',
			updated_at = NOW()
		WHERE id = $1
		  AND status IN ('draft', 'published')
	`,
		eventID,
	)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return apperrors.ErrInvalidInput
	}

	// Find all active attendees.
	rows, err := tx.Query(ctx, `
		SELECT user_id
		FROM registrations
		WHERE event_id = $1
		  AND status != 'cancelled'
	`,
		eventID,
	)

	if err != nil {
		return err
	}
	defer rows.Close()

	var userIDs []int64

	for rows.Next() {

		var userID int64

		if err := rows.Scan(&userID); err != nil {
			return err
		}

		userIDs = append(userIDs, userID)
	}

	if err := rows.Err(); err != nil {
		return err
	}

	// Create one outbox event per attendee.
	for _, userID := range userIDs {

		_, err := r.outboxRepo.Create(
			ctx,
			tx,
			"NOTIFICATION",
			"event",
			strconv.FormatInt(eventID, 10),
			map[string]interface{}{
				"user_id": userID,
				"type":    "EVENT_CANCELLED",
				"message": "The event you registered for has been cancelled.",
			},
		)

		if err != nil {
			return err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return err
	}

	return nil
}


func (r *Repository) CompleteEvent(
	ctx context.Context,
	eventID int64,
) error {

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	result, err := r.db.Exec(ctx, `
		UPDATE events
		SET
			status = 'completed',
			updated_at = NOW()
		WHERE id = $1
		  AND status = 'published'
	`,
		eventID,
	)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return errors.New(
			"event not found or cannot be completed",
		)
	}

	return nil
}



func (r *Repository) GetActiveRegistrantUserIDs(
	ctx context.Context,
	eventID int64,
) ([]int64, error) {

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	rows, err := r.db.Query(ctx, `
		SELECT user_id
		FROM registrations
		WHERE event_id = $1
		  AND status != 'cancelled'
		ORDER BY created_at ASC
	`, eventID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var userIDs []int64

	for rows.Next() {

		var userID int64

		if err := rows.Scan(&userID); err != nil {
			return nil, err
		}

		userIDs = append(userIDs, userID)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return userIDs, nil
}


func (r *Repository) GetAllEvents(
	ctx context.Context,
	page int,
	limit int,
	status string,
	order string,
) ([]Event, int, error) {

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	offset := (page - 1) * limit

	// Normalize status.
	status = strings.TrimSpace(strings.ToLower(status))

	// Normalize order.
	order = strings.ToLower(strings.TrimSpace(order))
	if order != "asc" {
		order = "desc"
	}

	var total int

	if status == "" || status == "all" {
		err := r.db.QueryRow(ctx, `
			SELECT COUNT(*)
			FROM events
		`).Scan(&total)

		if err != nil {
			return nil, 0, err
		}
	} else {
		err := r.db.QueryRow(ctx, `
			SELECT COUNT(*)
			FROM events
			WHERE status = $1
		`, status).Scan(&total)

		if err != nil {
			return nil, 0, err
		}
	}

	orderBy := "created_at DESC"

	if order == "asc" {
		orderBy = "created_at ASC"
	}

	query := `
		SELECT
			id,
			organization_id,
			title,
			description,
			venue,
			capacity,
			registration_deadline,
			start_time,
			end_time,
			status,
			created_at,
			updated_at
		FROM events
	`

	args := make([]interface{}, 0, 3)
	argIndex := 1

	if status != "" && status != "all" {
		query += ` WHERE status = $1`
		args = append(args, status)
		argIndex++
	}

	query += ` ORDER BY ` + orderBy
	query += ` LIMIT $` + strconv.Itoa(argIndex)
	args = append(args, limit)
	argIndex++

	query += ` OFFSET $` + strconv.Itoa(argIndex)
	args = append(args, offset)

	rows, err := r.db.Query(
		ctx,
		query,
		args...,
	)

	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	events := make([]Event, 0)

	for rows.Next() {
		var event Event

		err := rows.Scan(
			&event.ID,
			&event.OrganizationID,
			&event.Title,
			&event.Description,
			&event.Venue,
			&event.Capacity,
			&event.RegistrationDeadline,
			&event.StartTime,
			&event.EndTime,
			&event.Status,
			&event.CreatedAt,
			&event.UpdatedAt,
		)

		if err != nil {
			return nil, 0, err
		}

		events = append(events, event)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	return events, total, nil
}