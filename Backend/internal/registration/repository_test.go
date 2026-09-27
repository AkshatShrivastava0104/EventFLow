package registration

// import (
// 	"context"
// 	"fmt"
// 	"sync"
// 	"testing"
// 	"time"

// 	"github.com/jackc/pgx/v5/pgxpool"
// )

// func setupTestDB(t *testing.T) *pgxpool.Pool {

// 	t.Helper()

// 	ctx := context.Background()

// 	dsn := "postgres://postgres:postgres@localhost:5432/eventflow_test?sslmode=disable"

// 	db, err := pgxpool.New(ctx, dsn)
// 	if err != nil {
// 		t.Fatalf("failed to create test db pool: %v", err)
// 	}

// 	if err := db.Ping(ctx); err != nil {
// 		db.Close()
// 		t.Fatalf("failed to ping test db: %v", err)
// 	}

// 	return db
// }

// func cleanTestData(
// 	t *testing.T,
// 	db *pgxpool.Pool,
// ) {

// 	t.Helper()

// 	ctx := context.Background()

// 	_, err := db.Exec(ctx, `
// 		TRUNCATE
// 			checkins,
// 			tickets,
// 			waitlist,
// 			registrations,
// 			events,
// 			organization_members,
// 			organizations,
// 			users
// 		RESTART IDENTITY CASCADE
// 	`)

// 	if err != nil {
// 		t.Fatalf("failed to clean test database: %v", err)
// 	}
// }

// func TestRegisterUserConcurrency(t *testing.T) {

// 	db := setupTestDB(t)
// 	defer db.Close()

// 	cleanTestData(t, db)

// 	ctx := context.Background()

// 	// --------------------------------------------------
// 	// 1. Create users
// 	// --------------------------------------------------

// 	const totalUsers = 100

// 	for i := 1; i <= totalUsers; i++ {

// 		_, err := db.Exec(
// 			ctx,
// 			`
// 			INSERT INTO users (
// 				name,
// 				email,
// 				password_hash,
// 				role,
// 				email_verified,
// 				created_at,
// 				updated_at
// 			)
// 			VALUES (
// 				$1,
// 				$2,
// 				$3,
// 				'user',
// 				true,
// 				NOW(),
// 				NOW()
// 			)
// 			`,
// 			fmt.Sprintf("User %d", i),
// 			fmt.Sprintf("user%d@test.com", i),
// 			"test-password",
// 		)

// 		if err != nil {
// 			t.Fatalf("failed to create user %d: %v", i, err)
// 		}
// 	}

// 	// --------------------------------------------------
// 	// 2. Create organization
// 	// --------------------------------------------------

// 	var organizationID int64

// 	err := db.QueryRow(
// 		ctx,
// 		`
// 		INSERT INTO organizations (
// 			owner_id,
// 			name,
// 			description,
// 			created_at,
// 			updated_at
// 		)
// 		VALUES (
// 			1,
// 			'Concurrency Test Org',
// 			'Test organization',
// 			NOW(),
// 			NOW()
// 		)
// 		RETURNING id
// 		`,
// 	).Scan(&organizationID)

// 	if err != nil {
// 		t.Fatalf("failed to create organization: %v", err)
// 	}

// 	// --------------------------------------------------
// 	// 3. Create published event with capacity = 1
// 	// --------------------------------------------------

// 	var eventID int64

// 	err = db.QueryRow(
// 		ctx,
// 		`
// 		INSERT INTO events (
// 			organization_id,
// 			title,
// 			description,
// 			capacity,
// 			status,
// 			created_at,
// 			updated_at
// 		)
// 		VALUES (
// 			$1,
// 			'Concurrency Test Event',
// 			'Test event',
// 			1,
// 			'published',
// 			NOW(),
// 			NOW()
// 		)
// 		RETURNING id
// 		`,
// 		organizationID,
// 	).Scan(&eventID)

// 	if err != nil {
// 		t.Fatalf("failed to create event: %v", err)
// 	}

// 	// --------------------------------------------------
// 	// 4. Create repository
// 	// --------------------------------------------------

// 	repo := NewRepository(db, outboxRepo)

// 	// --------------------------------------------------
// 	// 5. Run 100 concurrent registrations
// 	// --------------------------------------------------

// 	var wg sync.WaitGroup

// 	errorsCh := make(chan error, totalUsers)

// 	wg.Add(totalUsers)

// 	for userID := 1; userID <= totalUsers; userID++ {

// 		go func(userID int) {

// 			defer wg.Done()

// 			_, err := repo.RegisterUser(
// 				ctx,
// 				eventID,
// 				int64(userID),
// 			)

// 			if err != nil {
// 				errorsCh <- err
// 			}

// 		}(userID)
// 	}

// 	wg.Wait()

// 	close(errorsCh)

// 	// We expect successful registration OR successful waitlisting.
// 	for err := range errorsCh {
// 		t.Logf("registration returned error: %v", err)
// 	}

// 	// --------------------------------------------------
// 	// 6. Check active registrations
// 	// --------------------------------------------------

// 	var activeRegistrations int

// 	err = db.QueryRow(
// 		ctx,
// 		`
// 		SELECT COUNT(*)
// 		FROM registrations
// 		WHERE event_id = $1
// 		  AND status != 'cancelled'
// 		`,
// 		eventID,
// 	).Scan(&activeRegistrations)

// 	if err != nil {
// 		t.Fatalf(
// 			"failed to count registrations: %v",
// 			err,
// 		)
// 	}

// 	if activeRegistrations != 1 {
// 		t.Fatalf(
// 			"expected exactly 1 active registration, got %d",
// 			activeRegistrations,
// 		)
// 	}

// 	// --------------------------------------------------
// 	// 7. Check waitlist
// 	// --------------------------------------------------

// 	var waitlistCount int

// 	err = db.QueryRow(
// 		ctx,
// 		`
// 		SELECT COUNT(*)
// 		FROM waitlist
// 		WHERE event_id = $1
// 		`,
// 		eventID,
// 	).Scan(&waitlistCount)

// 	if err != nil {
// 		t.Fatalf(
// 			"failed to count waitlist: %v",
// 			err,
// 		)
// 	}

// 	if waitlistCount != totalUsers-1 {
// 		t.Fatalf(
// 			"expected %d waitlisted users, got %d",
// 			totalUsers-1,
// 			waitlistCount,
// 		)
// 	}

// 	// --------------------------------------------------
// 	// 8. Verify positions
// 	// --------------------------------------------------

// 	var minPosition int
// 	var maxPosition int

// 	err = db.QueryRow(
// 		ctx,
// 		`
// 		SELECT
// 			MIN(position),
// 			MAX(position)
// 		FROM waitlist
// 		WHERE event_id = $1
// 		`,
// 		eventID,
// 	).Scan(
// 		&minPosition,
// 		&maxPosition,
// 	)

// 	if err != nil {
// 		t.Fatalf(
// 			"failed to verify waitlist positions: %v",
// 			err,
// 		)
// 	}

// 	if minPosition != 1 {
// 		t.Fatalf(
// 			"expected minimum position 1, got %d",
// 			minPosition,
// 		)
// 	}

// 	if maxPosition != totalUsers-1 {
// 		t.Fatalf(
// 			"expected maximum position %d, got %d",
// 			totalUsers-1,
// 			maxPosition,
// 		)
// 	}

// 	t.Logf(
// 		"Concurrency test passed: %d users, 1 registration, %d waitlisted",
// 		totalUsers,
// 		waitlistCount,
// 	)

// 	_ = time.Now()
// }