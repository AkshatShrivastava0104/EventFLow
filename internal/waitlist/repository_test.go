package waitlist

import (
	"context"
	"fmt"
	"sync"
	"testing"

	"github.com/AkshatShrivastava0104/EventFlow/internal/outbox"
	"github.com/jackc/pgx/v5/pgxpool"
)

func TestWaitlistPromotionConcurrency(t *testing.T) {

	ctx := context.Background()

	// Test database only.
	db, err := pgxpool.New(
		ctx,
		"postgres://postgres:postgres@localhost:5432/eventflow_test?sslmode=disable",
	)

	if err != nil {
		t.Fatalf("failed to create db pool: %v", err)
	}

	defer db.Close()

	if err := db.Ping(ctx); err != nil {
		t.Fatalf("failed to ping test database: %v", err)
	}

	// --------------------------------------------------
	// 1. Clean test database
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
			users
		RESTART IDENTITY CASCADE
	`)

	if err != nil {
		t.Fatalf("failed to clean test database: %v", err)
	}

	// --------------------------------------------------
	// 2. Create users
	// --------------------------------------------------

	for i := 1; i <= 3; i++ {

		_, err := db.Exec(
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
				$1,
				$2,
				$3,
				'user',
				true,
				NOW(),
				NOW()
			)
			`,
			fmt.Sprintf("Promotion User %d", i),
			fmt.Sprintf("promotion%d@test.com", i),
			"test-password",
		)

		if err != nil {
			t.Fatalf(
				"failed to create user %d: %v",
				i,
				err,
			)
		}
	}

	// --------------------------------------------------
	// 3. Create organization
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
			1,
			'Promotion Test Organization',
			'Concurrency test organization',
			NOW(),
			NOW()
		)
		RETURNING id
		`,
	).Scan(&organizationID)

	if err != nil {
		t.Fatalf(
			"failed to create organization: %v",
			err,
		)
	}

	// --------------------------------------------------
	// 4. Create published event with capacity = 1
	// --------------------------------------------------

	var eventID int64

	err = db.QueryRow(
		ctx,
		`
		INSERT INTO events (
			organization_id,
			title,
			description,
			capacity,
			status,
			created_at,
			updated_at
		)
		VALUES (
			$1,
			'Promotion Test Event',
			'Concurrency promotion test',
			1,
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

	// --------------------------------------------------
	// 5. User 1 has the only active registration
	// --------------------------------------------------

	_, err = db.Exec(
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
			1,
			$1,
			'pending',
			'unpaid',
			NOW()
		)
		`,
		eventID,
	)

	if err != nil {
		t.Fatalf(
			"failed to create initial registration: %v",
			err,
		)
	}

	// --------------------------------------------------
	// 6. Users 2 and 3 are on waitlist
	// --------------------------------------------------

	_, err = db.Exec(
		ctx,
		`
		INSERT INTO waitlist (
			user_id,
			event_id,
			position,
			created_at
		)
		VALUES
			(2, $1, 1, NOW()),
			(3, $1, 2, NOW())
		`,
		eventID,
	)

	if err != nil {
		t.Fatalf(
			"failed to create waitlist entries: %v",
			err,
		)
	}

	// --------------------------------------------------
	// 7. Cancel User 1 registration
	// --------------------------------------------------

	_, err = db.Exec(
		ctx,
		`
		UPDATE registrations
		SET status = 'cancelled'
		WHERE user_id = 1
		  AND event_id = $1
		  AND status != 'cancelled'
		`,
		eventID,
	)

	if err != nil {
		t.Fatalf(
			"failed to cancel initial registration: %v",
			err,
		)
	}

	// --------------------------------------------------
	// 8. Create actual waitlist repository
	// --------------------------------------------------

	outboxRepo := outbox.NewRepository(db)

	repo := NewRepository(
		db,
		outboxRepo,
	)

	// --------------------------------------------------
	// 9. Run concurrent promotion attempts
	// --------------------------------------------------

	const promotionAttempts = 10

	var wg sync.WaitGroup

	errCh := make(chan error, promotionAttempts)

	wg.Add(promotionAttempts)

	for i := 0; i < promotionAttempts; i++ {

		go func() {

			defer wg.Done()

			_, err := repo.PromoteNextUser(
				ctx,
				eventID,
			)

			if err != nil {
				errCh <- err
			}

		}()
	}

	wg.Wait()

	close(errCh)

	for err := range errCh {
		t.Fatalf(
			"promotion returned error: %v",
			err,
		)
	}

	// --------------------------------------------------
	// 10. Exactly ONE active registration should exist
	// --------------------------------------------------

	var activeRegistrations int

	err = db.QueryRow(
		ctx,
		`
		SELECT COUNT(*)
		FROM registrations
		WHERE event_id = $1
		  AND status != 'cancelled'
		`,
		eventID,
	).Scan(&activeRegistrations)

	if err != nil {
		t.Fatalf(
			"failed to count active registrations: %v",
			err,
		)
	}

	if activeRegistrations != 1 {
		t.Fatalf(
			"expected exactly 1 active registration, got %d",
			activeRegistrations,
		)
	}

	// --------------------------------------------------
	// 11. Exactly ONE waitlist entry should remain
	// --------------------------------------------------

	var remainingWaitlist int

	err = db.QueryRow(
		ctx,
		`
		SELECT COUNT(*)
		FROM waitlist
		WHERE event_id = $1
		`,
		eventID,
	).Scan(&remainingWaitlist)

	if err != nil {
		t.Fatalf(
			"failed to count remaining waitlist: %v",
			err,
		)
	}

	if remainingWaitlist != 1 {
		t.Fatalf(
			"expected 1 remaining waitlist entry, got %d",
			remainingWaitlist,
		)
	}

	// --------------------------------------------------
	// 12. User 2 should be promoted
	// --------------------------------------------------

	var promotedUserID int64

	err = db.QueryRow(
		ctx,
		`
		SELECT user_id
		FROM registrations
		WHERE event_id = $1
		  AND status != 'cancelled'
		`,
		eventID,
	).Scan(&promotedUserID)

	if err != nil {
		t.Fatalf(
			"failed to get promoted user: %v",
			err,
		)
	}

	if promotedUserID != 2 {
		t.Fatalf(
			"expected user 2 to be promoted, got user %d",
			promotedUserID,
		)
	}

	// --------------------------------------------------
	// 13. User 3 should remain on waitlist position 1
	// --------------------------------------------------

	var remainingUserID int64
	var remainingPosition int

	err = db.QueryRow(
		ctx,
		`
		SELECT user_id, position
		FROM waitlist
		WHERE event_id = $1
		`,
		eventID,
	).Scan(
		&remainingUserID,
		&remainingPosition,
	)

	if err != nil {
		t.Fatalf(
			"failed to inspect remaining waitlist: %v",
			err,
		)
	}

	if remainingUserID != 3 {
		t.Fatalf(
			"expected user 3 to remain on waitlist, got user %d",
			remainingUserID,
		)
	}

	if remainingPosition != 1 {
		t.Fatalf(
			"expected remaining position 1, got %d",
			remainingPosition,
		)
	}

	t.Log(
		"waitlist promotion concurrency test passed: " +
			"exactly one user was promoted",
	)
}