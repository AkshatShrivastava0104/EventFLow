package outbox

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/AkshatShrivastava0104/EventFlow/internal/queue"
	"github.com/jackc/pgx/v5/pgxpool"
)

func TestClaimPendingEvent(t *testing.T) {

	ctx := context.Background()

	// ==================================================
	// 1. PostgreSQL
	// ==================================================

	db, err := pgxpool.New(
		ctx,
		"postgres://postgres:postgres@localhost:5432/eventflow_test?sslmode=disable",
	)

	if err != nil {
		t.Fatalf("failed to create db pool: %v", err)
	}

	defer db.Close()

	if err := db.Ping(ctx); err != nil {
		t.Fatalf("failed to ping db: %v", err)
	}

	// ==================================================
	// 2. Clean table
	// ==================================================

	_, err = db.Exec(ctx, `
		TRUNCATE
			outbox_events
		RESTART IDENTITY CASCADE
	`)

	if err != nil {
		t.Fatalf("failed to clean outbox table: %v", err)
	}

	// ==================================================
	// 3. Payload
	// ==================================================

	payload, err := json.Marshal(
		queue.NotificationJob{
			UserID:  1,
			Type:    "TEST",
			Message: "outbox test",
		},
	)

	if err != nil {
		t.Fatalf("failed to marshal payload: %v", err)
	}

	// ==================================================
	// 4. Insert pending event
	// ==================================================

	var eventID int64

	err = db.QueryRow(
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
			'NOTIFICATION',
			'registration',
			'1',
			$1,
			'pending',
			0,
			NOW(),
			NOW(),
			NOW()
		)
		RETURNING id
		`,
		payload,
	).Scan(&eventID)

	if err != nil {
		t.Fatalf(
			"failed to create outbox event: %v",
			err,
		)
	}

	repo := NewRepository(db)

	// ==================================================
	// 5. Claim
	// ==================================================

	events, err := repo.ClaimPendingEvents(
		ctx,
		50,
	)

	if err != nil {
		t.Fatalf(
			"failed to claim event: %v",
			err,
		)
	}

	if len(events) != 1 {
		t.Fatalf(
			"expected 1 event, got %d",
			len(events),
		)
	}

	if events[0].ID != eventID {
		t.Fatalf(
			"expected event ID %d, got %d",
			eventID,
			events[0].ID,
		)
	}

	// ==================================================
	// 6. Verify processing status
	// ==================================================

	var status string

	err = db.QueryRow(
		ctx,
		`
		SELECT status
		FROM outbox_events
		WHERE id = $1
		`,
		eventID,
	).Scan(&status)

	if err != nil {
		t.Fatalf(
			"failed to read event status: %v",
			err,
		)
	}

	if status != "processing" {
		t.Fatalf(
			"expected processing, got %s",
			status,
		)
	}

	t.Log(
		"✅ pending event claimed and marked processing",
	)
}

func TestMarkFailedEventuallyMarksEventFailed(
	t *testing.T,
) {

	ctx := context.Background()

	// ==================================================
	// 1. PostgreSQL
	// ==================================================

	db, err := pgxpool.New(
		ctx,
		"postgres://postgres:postgres@localhost:5432/eventflow_test?sslmode=disable",
	)

	if err != nil {
		t.Fatalf("failed to create db pool: %v", err)
	}

	defer db.Close()

	if err := db.Ping(ctx); err != nil {
		t.Fatalf("failed to ping db: %v", err)
	}

	// ==================================================
	// 2. Clean table
	// ==================================================

	_, err = db.Exec(ctx, `
		TRUNCATE
			outbox_events
		RESTART IDENTITY CASCADE
	`)

	if err != nil {
		t.Fatalf(
			"failed to clean outbox table: %v",
			err,
		)
	}

	// ==================================================
	// 3. Insert processing event
	// ==================================================

	var eventID int64

	err = db.QueryRow(
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
			'NOTIFICATION',
			'registration',
			'1',
			'{}'::jsonb,
			'processing',
			0,
			NOW(),
			NOW(),
			NOW()
		)
		RETURNING id
		`,
	).Scan(&eventID)

	if err != nil {
		t.Fatalf(
			"failed to create outbox event: %v",
			err,
		)
	}

	repo := NewRepository(db)

	// ==================================================
	// 4. Simulate 5 failures
	// ==================================================

	for attempt := 1; attempt <= 5; attempt++ {

		// MarkFailed expects the failed event to be represented
		// as the current event. We explicitly put it into
		// processing before the simulated failure.
		_, err = db.Exec(
			ctx,
			`
			UPDATE outbox_events
			SET
				status = 'processing',
				updated_at = NOW()
			WHERE id = $1
			`,
			eventID,
		)

		if err != nil {
			t.Fatalf(
				"failed to prepare attempt %d: %v",
				attempt,
				err,
			)
		}

		err = repo.MarkFailed(
			ctx,
			eventID,
			0,
			time.Now().Add(time.Second),
		)

		if err != nil {
			t.Fatalf(
				"MarkFailed attempt %d failed: %v",
				attempt,
				err,
			)
		}

		var (
			status   string
			attempts int
		)

		err = db.QueryRow(
			ctx,
			`
			SELECT
				status,
				attempts
			FROM outbox_events
			WHERE id = $1
			`,
			eventID,
		).Scan(
			&status,
			&attempts,
		)

		if err != nil {
			t.Fatalf(
				"failed to read retry state: %v",
				err,
			)
		}

		expectedStatus := "pending"

		if attempt == 5 {
			expectedStatus = "failed"
		}

		if status != expectedStatus {
			t.Fatalf(
				"attempt %d: expected status %s, got %s",
				attempt,
				expectedStatus,
				status,
			)
		}

		if attempts != attempt {
			t.Fatalf(
				"attempt %d: expected attempts %d, got %d",
				attempt,
				attempt,
				attempts,
			)
		}
	}

	t.Log(
		"✅ outbox retry/backoff state works and event becomes failed after 5 attempts",
	)
}