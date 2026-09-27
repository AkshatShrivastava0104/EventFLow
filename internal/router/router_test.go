package router

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/AkshatShrivastava0104/EventFlow/internal/config"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)
func TestRegisterEventAPI(t *testing.T) {

	ctx := context.Background()

	// --------------------------------------------------
	// 1. Test PostgreSQL
	// --------------------------------------------------

	db, err := pgxpool.New(
		ctx,
		"postgres://postgres:postgres@localhost:5432/eventflow_test?sslmode=disable",
	)

	if err != nil {
		t.Fatalf("failed to create test db: %v", err)
	}

	defer db.Close()

	if err := db.Ping(ctx); err != nil {
		t.Fatalf("failed to ping test db: %v", err)
	}

	// --------------------------------------------------
	// 2. Clean test database
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
			users
		RESTART IDENTITY CASCADE
	`)

	if err != nil {
		t.Fatalf("failed to clean test db: %v", err)
	}

	// --------------------------------------------------
	// 3. Redis
	// --------------------------------------------------

	redisClient := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})

	defer redisClient.Close()

	if err := redisClient.Ping(ctx).Err(); err != nil {
		t.Fatalf("failed to connect to redis: %v", err)
	}

	// --------------------------------------------------
	// 4. Create config
	// --------------------------------------------------

	cfg := &config.Config{
		JWTSecret: "integration-test-secret",
	}

	// --------------------------------------------------
	// 5. Create test user
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
			'Integration Test User',
			'integration@test.com',
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
	// 6. Create organization
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
			'Integration Test Organization',
			'Integration test organization',
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
	// 7. Create published event
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
			'API Integration Event',
			'Testing registration API',
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
	// 8. Setup actual router
	// --------------------------------------------------

	r := SetupRouter(
		db,
		cfg,
		redisClient,
	)

	// --------------------------------------------------
	// 9. Create JWT
	// --------------------------------------------------

	claims := jwt.MapClaims{
		"user_id": userID,
		"email":   "integration@test.com",
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
		t.Fatalf("failed to create jwt: %v", err)
	}

	// --------------------------------------------------
	// 10. Make HTTP request
	// --------------------------------------------------

	url := "/api/v1/events/" +
		int64ToString(eventID) +
		"/register"

	// Simpler event ID URL construction
	url = "/api/v1/events/" +
		int64ToString(eventID) +
		"/register"

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

	// --------------------------------------------------
	// 11. Serve request
	// --------------------------------------------------

	r.ServeHTTP(
		recorder,
		req,
	)

	// --------------------------------------------------
	// 12. Assert HTTP response
	// --------------------------------------------------

	if recorder.Code != http.StatusCreated {
		t.Fatalf(
			"expected status %d, got %d, response: %s",
			http.StatusCreated,
			recorder.Code,
			recorder.Body.String(),
		)
	}

	// --------------------------------------------------
	// 13. Verify registration in DB
	// --------------------------------------------------

	var registrationCount int

	err = db.QueryRow(
		ctx,
		`
		SELECT COUNT(*)
		FROM registrations
		WHERE user_id = $1
		  AND event_id = $2
		  AND status != 'cancelled'
		`,
		userID,
		eventID,
	).Scan(&registrationCount)

	if err != nil {
		t.Fatalf(
			"failed to verify registration: %v",
			err,
		)
	}

	if registrationCount != 1 {
		t.Fatalf(
			"expected 1 registration, got %d",
			registrationCount,
		)
	}

	t.Log(
		"registration API integration test passed",
	)
}

func int64ToString(value int64) string {

	if value == 0 {
		return "0"
	}

	negative := value < 0

	if negative {
		value = -value
	}

	var digits []byte

	for value > 0 {
		digits = append(
			digits,
			byte('0'+value%10),
		)

		value /= 10
	}

	for i, j := 0, len(digits)-1; i < j; i, j = i+1, j-1 {
		digits[i], digits[j] = digits[j], digits[i]
	}

	if negative {
		digits = append([]byte{'-'}, digits...)
	}

	return string(digits)
}