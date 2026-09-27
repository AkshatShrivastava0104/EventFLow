package checkin

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"testing"
	"time"

	apperrors "github.com/AkshatShrivastava0104/EventFlow/internal/errors"
	"github.com/jackc/pgx/v5/pgxpool"
)

func TestCheckInConcurrency(t *testing.T) {

	ctx := context.Background()

	// ==================================================
	// 1. PostgreSQL
	// ==================================================

	db, err := pgxpool.New(
		ctx,
		"postgres://postgres:postgres@localhost:5432/eventflow_test?sslmode=disable",
	)

	if err != nil {
		t.Fatalf(
			"failed to create db pool: %v",
			err,
		)
	}

	defer db.Close()

	if err := db.Ping(ctx); err != nil {
		t.Fatalf(
			"failed to ping test database: %v",
			err,
		)
	}

	// ==================================================
	// 2. Clean DB
	// ==================================================

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
		t.Fatalf(
			"failed to clean test database: %v",
			err,
		)
	}

	// ==================================================
	// 3. Create attendee
	// ==================================================

	var attendeeID int64

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
			'Checkin Attendee',
			'checkin-attendee@test.com',
			'test-password',
			'user',
			true,
			NOW(),
			NOW()
		)
		RETURNING id
		`,
	).Scan(&attendeeID)

	if err != nil {
		t.Fatalf(
			"failed to create attendee: %v",
			err,
		)
	}

	// ==================================================
	// 4. Create volunteer
	// ==================================================

	var volunteerID int64

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
			'Checkin Volunteer',
			'checkin-volunteer@test.com',
			'test-password',
			'user',
			true,
			NOW(),
			NOW()
		)
		RETURNING id
		`,
	).Scan(&volunteerID)

	if err != nil {
		t.Fatalf(
			"failed to create volunteer: %v",
			err,
		)
	}

	// ==================================================
	// 5. Organization
	// ==================================================

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
			'Checkin Concurrency Org',
			'Testing concurrent checkins',
			NOW(),
			NOW()
		)
		RETURNING id
		`,
		volunteerID,
	).Scan(&organizationID)

	if err != nil {
		t.Fatalf(
			"failed to create organization: %v",
			err,
		)
	}

	_, err = db.Exec(
		ctx,
		`
		INSERT INTO organization_members (
			organization_id,
			user_id,
			role
		)
		VALUES (
			$1,
			$2,
			'OWNER'
		)
		ON CONFLICT DO NOTHING
		`,
		organizationID,
		volunteerID,
	)

	if err != nil {
		t.Fatalf(
			"failed to create owner membership: %v",
			err,
		)
	}

	// ==================================================
	// 6. Event
	// ==================================================

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
			'Checkin Concurrency Event',
			'Testing concurrent checkins',
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
		t.Fatalf(
			"failed to create event: %v",
			err,
		)
	}

	// ==================================================
	// 7. Registration
	// ==================================================

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
		attendeeID,
		eventID,
	).Scan(&registrationID)

	if err != nil {
		t.Fatalf(
			"failed to create registration: %v",
			err,
		)
	}

	// ==================================================
	// 8. Ticket
	// ==================================================

	ticketNumber := "CHECKIN-CONCURRENCY-001"

	qrCode := fmt.Sprintf(
		"eventflow:test:%d",
		registrationID,
	)

	var ticketID int64

	err = db.QueryRow(
		ctx,
		`
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
		t.Fatalf(
			"failed to create ticket: %v",
			err,
		)
	}

	// ==================================================
	// 9. Repository
	// ==================================================

	repo := NewRepository(db)

	// ==================================================
	// 10. Concurrent attempts
	// ==================================================

	const attempts = 50

	var wg sync.WaitGroup
	wg.Add(attempts)

	successCount := 0
	conflictCount := 0
	unexpectedErrors := 0

	var mu sync.Mutex

	for i := 0; i < attempts; i++ {

		go func(attempt int) {

			defer wg.Done()

			checkinID, err := repo.CheckIn(
				ctx,
				eventID,
				ticketNumber,
				&volunteerID,
			)

			mu.Lock()
			defer mu.Unlock()

			if err == nil {

				if checkinID <= 0 {
					unexpectedErrors++

					t.Logf(
						"attempt %d returned invalid checkin id: %d",
						attempt,
						checkinID,
					)

					return
				}

				successCount++

				return
			}

			if errors.Is(
				err,
				apperrors.ErrConflict,
			) {
				conflictCount++
				return
			}

			unexpectedErrors++

			t.Logf(
				"unexpected error on attempt %d: %v",
				attempt,
				err,
			)

		}(i)
	}

	wg.Wait()

	// ==================================================
	// 11. Exactly one DB check-in
	// ==================================================

	var checkinCount int

	err = db.QueryRow(
		ctx,
		`
		SELECT COUNT(*)
		FROM checkins
		WHERE ticket_id = $1
		`,
		ticketID,
	).Scan(&checkinCount)

	if err != nil {
		t.Fatalf(
			"failed to count checkins: %v",
			err,
		)
	}

	if checkinCount != 1 {
		t.Fatalf(
			"expected exactly 1 checkin, got %d",
			checkinCount,
		)
	}

	// ==================================================
	// 12. Exactly one success
	// ==================================================

	if successCount != 1 {
		t.Fatalf(
			"expected exactly 1 successful checkin, got %d",
			successCount,
		)
	}

	// ==================================================
	// 13. Remaining attempts must conflict
	// ==================================================

	if conflictCount != attempts-1 {
		t.Fatalf(
			"expected %d conflicts, got %d",
			attempts-1,
			conflictCount,
		)
	}

	// ==================================================
	// 14. No unexpected errors
	// ==================================================

	if unexpectedErrors != 0 {
		t.Fatalf(
			"expected 0 unexpected errors, got %d",
			unexpectedErrors,
		)
	}

	t.Logf(
		"check-in concurrency passed: %d attempts, %d success, %d conflicts",
		attempts,
		successCount,
		conflictCount,
	)

	// Silence unused time import if the repository
	// changes in the future and retries are removed.
	_ = time.Second
}