package outbox

import (
	"context"
	"encoding/json"
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

// Create inserts an outbox event.
// This function can be called using an existing transaction.
func (r *Repository) Create(
	ctx context.Context,
	tx pgx.Tx,
	eventType string,
	aggregateType string,
	aggregateID string,
	payload any,
) (int64, error) {

	data, err := json.Marshal(payload)
	if err != nil {
		return 0, err
	}

	var eventID int64

	err = tx.QueryRow(
		ctx,
		`
		INSERT INTO outbox_events (
			event_type,
			aggregate_type,
			aggregate_id,
			payload,
			status,
			attempts,
			available_at,
			created_at,
			updated_at
		)
		VALUES (
			$1,
			$2,
			$3,
			$4,
			'pending',
			0,
			NOW(),
			NOW(),
			NOW()
		)
		RETURNING id
		`,
		eventType,
		aggregateType,
		aggregateID,
		data,
	).Scan(&eventID)

	if err != nil {
		return 0, err
	}

	return eventID, nil
}

// GetPendingEvents fetches a small batch of available outbox events.
func (r *Repository) ClaimPendingEvents(
	ctx context.Context,
	limit int,
) ([]OutboxEvent, error) {

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}

	defer func() {
		_ = tx.Rollback(ctx)
	}()

	rows, err := tx.Query(ctx, `
		SELECT
			id,
			event_type,
			aggregate_type,
			aggregate_id,
			payload,
			status,
			attempts,
			available_at,
			processed_at,
			created_at,
			updated_at
		FROM outbox_events
		WHERE status = 'pending'
		  AND available_at <= NOW()
		ORDER BY id ASC
		LIMIT $1
		FOR UPDATE SKIP LOCKED
	`, limit)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []OutboxEvent

	for rows.Next() {

		var event OutboxEvent

		if err := rows.Scan(
			&event.ID,
			&event.EventType,
			&event.AggregateType,
			&event.AggregateID,
			&event.Payload,
			&event.Status,
			&event.Attempts,
			&event.AvailableAt,
			&event.ProcessedAt,
			&event.CreatedAt,
			&event.UpdatedAt,
		); err != nil {
			return nil, err
		}

		events = append(events, event)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	if len(events) == 0 {
		if err := tx.Commit(ctx); err != nil {
			return nil, err
		}
		return nil, nil
	}

	ids := make([]int64, 0, len(events))

	for _, event := range events {
		ids = append(ids, event.ID)
	}

	_, err = tx.Exec(ctx, `
		UPDATE outbox_events
		SET
			status = 'processing',
			updated_at = NOW()
		WHERE id = ANY($1)
	`, ids)

	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return events, nil
}

// MarkProcessed marks an outbox event as successfully handled.
func (r *Repository) MarkProcessed(
	ctx context.Context,
	eventID int64,
) error {

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	_, err := r.db.Exec(
		ctx,
		`
		UPDATE outbox_events
		SET
			status = 'processed',
			processed_at = NOW(),
			updated_at = NOW()
		WHERE id = $1
		`,
		eventID,
	)

	return err
}

// MarkFailed schedules an event for retry.
func (r *Repository) MarkFailed(
	ctx context.Context,
	eventID int64,
	_ int,
	nextAvailableAt time.Time,
) error {

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	_, err := r.db.Exec(
		ctx,
		`
		UPDATE outbox_events
		SET
			attempts = attempts + 1,
			status = CASE
				WHEN attempts + 1 >= 5 THEN 'failed'
				ELSE 'pending'
			END,
			available_at = $2,
			updated_at = NOW()
		WHERE id = $1
		`,
		eventID,
		nextAvailableAt,
	)

	return err
}