package router

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/AkshatShrivastava0104/EventFlow/internal/config"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

func TestAPIValidation(t *testing.T) {

	ctx := context.Background()

	db, err := pgxpool.New(
		ctx,
		"postgres://postgres:postgres@localhost:5432/eventflow_test?sslmode=disable",
	)
	if err != nil {
		t.Fatalf("failed to create db: %v", err)
	}
	defer db.Close()

	if err := db.Ping(ctx); err != nil {
		t.Fatalf("failed to ping db: %v", err)
	}

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
		t.Fatalf("failed to clean db: %v", err)
	}

	redisClient := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})
	defer redisClient.Close()

	if err := redisClient.Ping(ctx).Err(); err != nil {
		t.Fatalf("failed to connect redis: %v", err)
	}

	cfg := &config.Config{
		JWTSecret: "integration-test-secret",
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
			'Validation User',
			'validation@test.com',
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
	// JWT
	// --------------------------------------------------

	token := jwt.NewWithClaims(
		jwt.SigningMethodHS256,
		jwt.MapClaims{
			"user_id": userID,
			"email":   "validation@test.com",
			"role":    "user",
			"exp":     time.Now().Add(time.Hour).Unix(),
		},
	)

	accessToken, err := token.SignedString(
		[]byte(cfg.JWTSecret),
	)

	if err != nil {
		t.Fatalf("failed to create JWT: %v", err)
	}

	r := SetupRouter(
		db,
		cfg,
		redisClient,
	)

	// ==================================================
	// 1. Invalid event ID
	// ==================================================

	req := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/events/not-a-number/register",
		nil,
	)

	req.Header.Set(
		"Authorization",
		"Bearer "+accessToken,
	)

	rec := httptest.NewRecorder()

	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf(
			"expected 400 for invalid event id, got %d body=%s",
			rec.Code,
			rec.Body.String(),
		)
	}

	t.Log("✅ Invalid event ID → 400")

	// ==================================================
	// 2. Missing token
	// ==================================================

	req = httptest.NewRequest(
		http.MethodPost,
		"/api/v1/events/1/register",
		nil,
	)

	rec = httptest.NewRecorder()

	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf(
			"expected 401 without token, got %d body=%s",
			rec.Code,
			rec.Body.String(),
		)
	}

	t.Log("✅ Missing token → 401")

	// ==================================================
	// 3. Invalid JSON for organization creation
	// ==================================================

	invalidJSON := `{
		"name":
	}`

	req = httptest.NewRequest(
		http.MethodPost,
		"/api/v1/organizations",
		strings.NewReader(invalidJSON),
	)

	req.Header.Set(
		"Authorization",
		"Bearer "+accessToken,
	)

	req.Header.Set(
		"Content-Type",
		"application/json",
	)

	rec = httptest.NewRecorder()

	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf(
			"expected 400 for invalid JSON, got %d body=%s",
			rec.Code,
			rec.Body.String(),
		)
	}

	t.Log("✅ Invalid JSON → 400")

	// ==================================================
	// 4. Invalid ticket/check-in body
	// ==================================================

	req = httptest.NewRequest(
		http.MethodPost,
		"/api/v1/events/1/checkin",
		strings.NewReader(`{"wrong_field":"abc"}`),
	)

	req.Header.Set(
		"Authorization",
		"Bearer "+accessToken,
	)

	req.Header.Set(
		"Content-Type",
		"application/json",
	)

	rec = httptest.NewRecorder()

	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf(
			"expected 400 for invalid check-in payload, got %d body=%s",
			rec.Code,
			rec.Body.String(),
		)
	}

	t.Log("✅ Invalid check-in payload → 400")

	t.Log("✅ API validation integration tests passed")
}