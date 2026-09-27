package ticket

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"testing"

	apperrors "github.com/AkshatShrivastava0104/EventFlow/internal/errors"
	"github.com/AkshatShrivastava0104/EventFlow/internal/outbox"
	"github.com/jackc/pgx/v5/pgxpool"
)

func TestCreateTicketConcurrency(t *testing.T) {

	ctx := context.Background()

	db, err := pgxpool.New(
		ctx,
		"postgres://postgres:postgres@localhost:5432/eventflow_test?sslmode=disable",
	)

	if err != nil {
		t.Fatalf("failed to create db pool: %v", err)
	}

	defer db.Close()

	if err := db.Ping(ctx); err != nil {
		t.Fatalf("failed to ping test db: %v", err)
	}

	// --------------------------------------------------
	// Clean test database
	// --------------------------------------------------

	_, err = db.Exec(ctx, `
		TRUNCATE
			checkins,
			tickets,
			waitlist,
			registrations,
			events,
			organization_members,
			organizations,
			notifications,
			audit_logs,
			refresh_tokens,
			outbox_events,
			users
		RESTART IDENTITY CASCADE
	`)

	if err != nil {
		t.Fatalf("failed to clean test db: %v", err)
	}

	// --------------------------------------------------
	// Create user
	// --------------------------------------------------

	var userID int64

	err = db.QueryRow(
		ctx,
		`
		INSERT INTO users (
			name,
			email,
			password_hash,
			role,
			email_verified,
			created_at,
			updated_at
		)
		VALUES (
			'Ticket Concurrency User',
			'ticket-concurrency@test.com',
			'test-password',
			'user',
			true,
			NOW(),
			NOW()
		)
		RETURNING id
		`,
	).Scan(&userID)

	if err != nil {
		t.Fatalf("failed to create user: %v", err)
	}

	// --------------------------------------------------
	// Create organization
	// --------------------------------------------------

	var organizationID int64

	err = db.QueryRow(
		ctx,
		`
		INSERT INTO organizations (
			owner_id,
			name,
			description,
			created_at,
			updated_at
		)
		VALUES (
			$1,
			'Ticket Concurrency Org',
			'Testing ticket concurrency',
			NOW(),
			NOW()
		)
		RETURNING id
		`,
		userID,
	).Scan(&organizationID)

	if err != nil {
		t.Fatalf("failed to create organization: %v", err)
	}

	// --------------------------------------------------
	// Create event
	// --------------------------------------------------

	var eventID int64

	err = db.QueryRow(
		ctx,
		`
		INSERT INTO events (
			organization_id,
			title,
			description,
			venue,
			capacity,
			status,
			created_at,
			updated_at
		)
		VALUES (
			$1,
			'Ticket Concurrency Event',
			'Testing ticket concurrency',
			'Chandigarh',
			10,
			'published',
			NOW(),
			NOW()
		)
		RETURNING id
		`,
		organizationID,
	).Scan(&eventID)

	if err != nil {
		t.Fatalf("failed to create event: %v", err)
	}

	// --------------------------------------------------
	// Create registration
	// --------------------------------------------------

	var registrationID int64

	err = db.QueryRow(
		ctx,
		`
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
		t.Fatalf("failed to create registration: %v", err)
	}

	// --------------------------------------------------
	// Repository
	// --------------------------------------------------

	outboxRepo := outbox.NewRepository(db)

	repo := NewRepository(
		db,
		outboxRepo,
	)

	// --------------------------------------------------
	// 50 concurrent ticket creation requests
	// --------------------------------------------------

	const attempts = 50

	var wg sync.WaitGroup

	wg.Add(attempts)

	successCount := 0
	conflictCount := 0
	unexpectedErrors := 0

	var mu sync.Mutex

	for i := 0; i < attempts; i++ {

		go func(i int) {

			defer wg.Done()

			ticketNumber := fmt.Sprintf(
				"TEST-TICKET-%d",
				i,
			)

			qrCode := fmt.Sprintf(
				"eventflow:test:%d:%d",
				registrationID,
				i,
			)

			_, err := repo.CreateTicket(
				ctx,
				registrationID,
				ticketNumber,
				qrCode,
				userID,
			)

			mu.Lock()
			defer mu.Unlock()

			if err == nil {
				successCount++
				return
			}

			if errors.Is(err, apperrors.ErrConflict) {
				conflictCount++
				return
			}

			unexpectedErrors++

			t.Logf(
				"unexpected error from goroutine %d: %v",
				i,
				err,
			)

		}(i)
	}

	wg.Wait()

	// --------------------------------------------------
	// Exactly 1 ticket should exist
	// --------------------------------------------------

	var ticketCount int

	err = db.QueryRow(
		ctx,
		`
		SELECT COUNT(*)
		FROM tickets
		WHERE registration_id = $1
		`,
		registrationID,
	).Scan(&ticketCount)

	if err != nil {
		t.Fatalf(
			"failed to count tickets: %v",
			err,
		)
	}

	if ticketCount != 1 {
		t.Fatalf(
			"expected exactly 1 ticket, got %d",
			ticketCount,
		)
	}

	// --------------------------------------------------
	// No unexpected errors
	// --------------------------------------------------

	if unexpectedErrors != 0 {
		t.Fatalf(
			"expected no unexpected errors, got %d",
			unexpectedErrors,
		)
	}

	// --------------------------------------------------
	// Exactly one request should succeed
	// --------------------------------------------------

	if successCount != 1 {
		t.Fatalf(
			"expected exactly 1 successful ticket creation, got %d",
			successCount,
		)
	}

	// --------------------------------------------------
	// Remaining requests should conflict
	// --------------------------------------------------

	if conflictCount != attempts-1 {
		t.Fatalf(
			"expected %d conflicts, got %d",
			attempts-1,
			conflictCount,
		)
	}

	t.Logf(
		"ticket concurrency passed: %d attempts, %d success, %d conflicts",
		attempts,
		successCount,
		conflictCount,
	)
}
