package router

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

	"github.com/AkshatShrivastava0104/EventFlow/internal/config"
	"github.com/AkshatShrivastava0104/EventFlow/internal/event"
	"github.com/AkshatShrivastava0104/EventFlow/internal/outbox"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

func TestRegisterFullEventAutomaticallyWaitlistsUser(t *testing.T) {

	ctx := context.Background()

	// ==================================================
	// 1. Connect to test PostgreSQL
	// ==================================================

	db, err := pgxpool.New(
		ctx,
		"postgres://postgres:postgres@localhost:5432/eventflow_test?sslmode=disable",
	)

	if err != nil {
		t.Fatalf(
			"failed to create test db pool: %v",
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

	t.Log("✅ PostgreSQL connected")

	// ==================================================
	// 2. Clean test database
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
			users
		RESTART IDENTITY CASCADE
	`)

	if err != nil {
		t.Fatalf(
			"failed to clean test db: %v",
			err,
		)
	}

	t.Log("✅ Test database cleaned")

	// ==================================================
	// 3. Connect to Redis
	// ==================================================

	redisClient := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})

	defer redisClient.Close()

	if err := redisClient.Ping(ctx).Err(); err != nil {
		t.Fatalf(
			"failed to connect to redis: %v",
			err,
		)
	}

	t.Log("✅ Redis connected")

	// ==================================================
	// 4. Config
	// ==================================================

	cfg := &config.Config{
		JWTSecret: "integration-test-secret",
	}

	// ==================================================
	// 5. Create User A
	// ==================================================

	var userAID int64

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
			'User A',
			'usera@test.com',
			'test-password',
			'user',
			true,
			NOW(),
			NOW()
		)
		RETURNING id
		`,
	).Scan(&userAID)

	if err != nil {
		t.Fatalf(
			"failed to create user A: %v",
			err,
		)
	}

	t.Logf(
		"✅ User A created: user_id=%d",
		userAID,
	)

	// ==================================================
	// 6. Create User B
	// ==================================================

	var userBID int64

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
			'User B',
			'userb@test.com',
			'test-password',
			'user',
			true,
			NOW(),
			NOW()
		)
		RETURNING id
		`,
	).Scan(&userBID)

	if err != nil {
		t.Fatalf(
			"failed to create user B: %v",
			err,
		)
	}

	t.Logf(
		"✅ User B created: user_id=%d",
		userBID,
	)

	// ==================================================
	// 7. Create organization
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
			'Waitlist Integration Org',
			'Testing automatic waitlist',
			NOW(),
			NOW()
		)
		RETURNING id
		`,
		userAID,
	).Scan(&organizationID)

	if err != nil {
		t.Fatalf(
			"failed to create organization: %v",
			err,
		)
	}

	t.Logf(
		"✅ Organization created: organization_id=%d owner_id=%d",
		organizationID,
		userAID,
	)

	// ==================================================
	// 8. Create published event with capacity = 1
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
			'Waitlist Integration Event',
			'Testing automatic waitlist',
			'Chandigarh',
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

	t.Logf(
		"✅ Event created: event_id=%d",
		eventID,
	)

	// ==================================================
	// 9. DEBUG: Verify event directly in DB
	// ==================================================

	var (
		debugEventID       int64
		debugOrganizationID int64
		debugTitle         string
		debugCapacity      *int
		debugStatus        string
	)

	err = db.QueryRow(
		ctx,
		`
		SELECT
			id,
			organization_id,
			title,
			capacity,
			status
		FROM events
		WHERE id = $1
		`,
		eventID,
	).Scan(
		&debugEventID,
		&debugOrganizationID,
		&debugTitle,
		&debugCapacity,
		&debugStatus,
	)

	if err != nil {
		t.Fatalf(
			"❌ DEBUG: created event cannot be read back from DB: %v",
			err,
		)
	}

	t.Logf(
		"DEBUG EVENT → id=%d org=%d title=%q capacity=%v status=%q",
		debugEventID,
		debugOrganizationID,
		debugTitle,
		debugCapacity,
		debugStatus,
	)

	if debugStatus != "published" {
		t.Fatalf(
			"❌ DEBUG: expected published status, got %q",
			debugStatus,
		)
	}

	if debugCapacity == nil || *debugCapacity != 1 {
		t.Fatalf(
			"❌ DEBUG: expected capacity 1, got %v",
			debugCapacity,
		)
	}

	// ==================================================
	// 10. DEBUG: Test Event Repository directly
	// ==================================================
	outboxRepo := outbox.NewRepository(db)

	eventRepo := event.NewRepository(db, outboxRepo)

	debugEvent, err := eventRepo.GetEventByID(
		ctx,
		eventID,
	)

	if err != nil {
		t.Fatalf(
			"❌ DEBUG: eventRepo.GetEventByID(%d) failed: %v",
			eventID,
			err,
		)
	}

	t.Logf(
		"✅ DEBUG: eventRepo.GetEventByID works → ID=%d OrgID=%d Status=%s",
		debugEvent.ID,
		debugEvent.OrganizationID,
		debugEvent.Status,
	)

	// ==================================================
	// 11. User A occupies the only seat
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
		userAID,
		eventID,
	).Scan(&registrationID)

	if err != nil {
		t.Fatalf(
			"failed to create initial registration: %v",
			err,
		)
	}

	t.Logf(
		"✅ User A occupies seat: registration_id=%d",
		registrationID,
	)

	// ==================================================
	// 12. Verify event is actually FULL
	// ==================================================

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

	t.Logf(
		"DEBUG CAPACITY → capacity=1 active_registrations=%d",
		activeRegistrations,
	)

	if activeRegistrations != 1 {
		t.Fatalf(
			"expected event to be full with 1 registration, got %d",
			activeRegistrations,
		)
	}

	// ==================================================
	// 13. Create actual router
	// ==================================================

	r := SetupRouter(
		db,
		cfg,
		redisClient,
	)

	t.Log("✅ Router created")

	// ==================================================
	// 14. Create JWT for User B
	// ==================================================

	claims := jwt.MapClaims{
		"user_id": userBID,
		"email":   "userb@test.com",
		"role":    "user",
		"exp":     time.Now().Add(time.Hour).Unix(),
	}

	token := jwt.NewWithClaims(
		jwt.SigningMethodHS256,
		claims,
	)

	accessToken, err := token.SignedString(
		[]byte(cfg.JWTSecret),
	)

	if err != nil {
		t.Fatalf(
			"failed to create jwt: %v",
			err,
		)
	}

	t.Logf(
		"✅ JWT created for user_id=%d",
		userBID,
	)

	// ==================================================
	// 15. Make HTTP registration request
	// ==================================================

	url := "/api/v1/events/" +
		strconv.FormatInt(eventID, 10) +
		"/register"

	t.Logf(
		"HTTP REQUEST → POST %s",
		url,
	)

	req := httptest.NewRequest(
		http.MethodPost,
		url,
		nil,
	)

	req.Header.Set(
		"Authorization",
		"Bearer "+accessToken,
	)

	req.Header.Set(
		"Content-Type",
		"application/json",
	)

	recorder := httptest.NewRecorder()

	// ==================================================
	// 16. Execute request
	// ==================================================

	r.ServeHTTP(
		recorder,
		req,
	)

	t.Logf(
		"HTTP RESPONSE → status=%d body=%s",
		recorder.Code,
		recorder.Body.String(),
	)

	// ==================================================
	// 17. Validate HTTP response
	// ==================================================

	if recorder.Code != http.StatusCreated {
		t.Fatalf(
			"expected status %d, got %d, response: %s",
			http.StatusCreated,
			recorder.Code,
			recorder.Body.String(),
		)
	}

	// ==================================================
	// 18. Verify waitlist entry
	// ==================================================

	var waitlistUserID int64
	var position int

	err = db.QueryRow(
		ctx,
		`
		SELECT user_id, position
		FROM waitlist
		WHERE event_id = $1
		ORDER BY position
		LIMIT 1
		`,
		eventID,
	).Scan(
		&waitlistUserID,
		&position,
	)

	if err != nil {
		t.Fatalf(
			"failed to find waitlist entry: %v",
			err,
		)
	}

	t.Logf(
		"WAITLIST → user_id=%d position=%d",
		waitlistUserID,
		position,
	)

	if waitlistUserID != userBID {
		t.Fatalf(
			"expected user %d in waitlist, got user %d",
			userBID,
			waitlistUserID,
		)
	}

	if position != 1 {
		t.Fatalf(
			"expected waitlist position 1, got %d",
			position,
		)
	}

	// ==================================================
	// 19. Verify User B was NOT registered
	// ==================================================

	var userBActiveRegistrations int

	err = db.QueryRow(
		ctx,
		`
		SELECT COUNT(*)
		FROM registrations
		WHERE user_id = $1
		  AND event_id = $2
		  AND status != 'cancelled'
		`,
		userBID,
		eventID,
	).Scan(&userBActiveRegistrations)

	if err != nil {
		t.Fatalf(
			"failed to verify User B registration: %v",
			err,
		)
	}

	t.Logf(
		"USER B ACTIVE REGISTRATIONS → %d",
		userBActiveRegistrations,
	)

	if userBActiveRegistrations != 0 {
		t.Fatalf(
			"expected user B to have 0 active registrations, got %d",
			userBActiveRegistrations,
		)
	}

	t.Log(
		"✅ automatic waitlist API integration test passed",
	)
}