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

func TestOwnerProtectedEventEndpoint(t *testing.T) {
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
	// Create normal user
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
			'Normal User',
			'normal-rbac@test.com',
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
		t.Fatalf("failed to create normal user: %v", err)
	}

	// --------------------------------------------------
	// Create owner
	// --------------------------------------------------

	var ownerID int64

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
			'Owner User',
			'owner-rbac@test.com',
			'test-password',
			'user',
			true,
			NOW(),
			NOW()
		)
		RETURNING id
		`,
	).Scan(&ownerID)

	if err != nil {
		t.Fatalf("failed to create owner: %v", err)
	}

	// --------------------------------------------------
	// Create admin
	// --------------------------------------------------

	var adminID int64

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
			'Admin User',
			'admin-rbac@test.com',
			'test-password',
			'user',
			true,
			NOW(),
			NOW()
		)
		RETURNING id
		`,
	).Scan(&adminID)

	if err != nil {
		t.Fatalf("failed to create admin: %v", err)
	}

	// --------------------------------------------------
	// Organization
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
			'RBAC Test Org',
			'RBAC integration test',
			NOW(),
			NOW()
		)
		RETURNING id
		`,
		ownerID,
	).Scan(&organizationID)

	if err != nil {
		t.Fatalf("failed to create organization: %v", err)
	}

	// --------------------------------------------------
	// Owner membership
	// --------------------------------------------------

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
		ownerID,
	)

	if err != nil {
		t.Fatalf("failed to create owner membership: %v", err)
	}

	// --------------------------------------------------
	// Admin membership
	// --------------------------------------------------

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
			'ADMIN'
		)
		ON CONFLICT DO NOTHING
		`,
		organizationID,
		adminID,
	)

	if err != nil {
		t.Fatalf("failed to create admin membership: %v", err)
	}

	// --------------------------------------------------
	// Event
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
			'RBAC Test Event',
			'RBAC test',
			'Chandigarh',
			10,
			'draft',
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

	r := SetupRouter(
		db,
		cfg,
		redisClient,
	)

	// --------------------------------------------------
	// Helper to create token
	// --------------------------------------------------

	createToken := func(userID int64) string {
		claims := jwt.MapClaims{
			"user_id":      userID,
			"auth_version": 1,
			"exp": time.Now().
				Add(time.Hour).
				Unix(),
		}

		token := jwt.NewWithClaims(
			jwt.SigningMethodHS256,
			claims,
		)

		value, err := token.SignedString(
			[]byte(cfg.JWTSecret),
		)

		if err != nil {
			t.Fatalf("failed to sign token: %v", err)
		}

		return value
	}

	eventURL := "/api/v1/events/" +
		int64ToString(eventID) +
		"/publish"

	// --------------------------------------------------
	// Case 1: No token → 401
	// --------------------------------------------------

	req := httptest.NewRequest(
		http.MethodPost,
		eventURL,
		nil,
	)

	rec := httptest.NewRecorder()

	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf(
			"expected 401 without token, got %d body=%s",
			rec.Code,
			rec.Body.String(),
		)
	}

	t.Log("✅ No token → 401")

	// --------------------------------------------------
	// Case 2: Normal user → 403
	// --------------------------------------------------

	userToken := createToken(userID)

	req = httptest.NewRequest(
		http.MethodPost,
		eventURL,
		nil,
	)

	req.Header.Set(
		"Authorization",
		"Bearer "+userToken,
	)

	rec = httptest.NewRecorder()

	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf(
			"expected 403 for normal user, got %d body=%s",
			rec.Code,
			rec.Body.String(),
		)
	}

	t.Log("✅ Normal user → 403")

	// --------------------------------------------------
	// Case 3: Owner → 403
	// --------------------------------------------------

	ownerToken := createToken(ownerID)

	req = httptest.NewRequest(
		http.MethodPost,
		eventURL,
		nil,
	)

	req.Header.Set(
		"Authorization",
		"Bearer "+ownerToken,
	)

	rec = httptest.NewRecorder()

	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf(
			"expected 403 for owner, got %d body=%s",
			rec.Code,
			rec.Body.String(),
		)
	}

	t.Log("✅ Owner → 403")

	// --------------------------------------------------
	// Case 4: Admin → 200
	// --------------------------------------------------

	adminToken := createToken(adminID)

	req = httptest.NewRequest(
		http.MethodPost,
		eventURL,
		nil,
	)

	req.Header.Set(
		"Authorization",
		"Bearer "+adminToken,
	)

	rec = httptest.NewRecorder()

	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf(
			"expected 200 for admin, got %d body=%s",
			rec.Code,
			rec.Body.String(),
		)
	}

	t.Log("✅ Admin → 200")

	// --------------------------------------------------
	// Verify event was actually published
	// --------------------------------------------------

	var status string

	err = db.QueryRow(
		ctx,
		`
		SELECT status
		FROM events
		WHERE id = $1
		`,
		eventID,
	).Scan(&status)

	if err != nil {
		t.Fatalf(
			"failed to verify event status: %v",
			err,
		)
	}

	if status != "published" {
		t.Fatalf(
			"expected event status to be published, got %q",
			status,
		)
	}

	t.Log("✅ Event status changed to published")

	t.Log("✅ Authentication + RBAC integration test passed")
}