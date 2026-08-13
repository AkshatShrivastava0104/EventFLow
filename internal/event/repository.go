package event

import (
	"context"
	"time"

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
) ([]Event, error) {

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

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
	`, organizationID)

	if err != nil {
		return nil, err
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
			return nil, err
		}

		events = append(events, event)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return events, nil
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