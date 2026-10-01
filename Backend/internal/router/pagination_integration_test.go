package router

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/AkshatShrivastava0104/EventFlow/internal/config"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

func TestPaginationEndpoints(t *testing.T) {

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

	t.Log("✅ PostgreSQL connected")

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
		t.Fatalf("failed to clean db: %v", err)
	}

	t.Log("✅ Test database cleaned")

	// ==================================================
	// 3. Redis
	// ==================================================

	redisClient := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})

	defer redisClient.Close()

	if err := redisClient.Ping(ctx).Err(); err != nil {
		t.Fatalf("failed to connect Redis: %v", err)
	}

	t.Log("✅ Redis connected")

	// ==================================================
	// 4. Config
	// ==================================================

	cfg := &config.Config{
		JWTSecret: "integration-test-secret",
	}

	// ==================================================
	// 5. Create owner/user
	// ==================================================

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
			'Pagination User',
			'pagination-user@test.com',
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

	t.Logf("✅ User created: user_id=%d", userID)

	// ==================================================
	// 6. Create organization
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
			'Pagination Test Org',
			'Pagination integration test',
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

	_, err = db.Exec(
		ctx,
		`
		INSERT INTO organization_members (
			organization_id,
			user_id,
			role
		)
		VALUES ($1, $2, 'ADMIN')
		`,
		organizationID,
		userID,
	)

	if err != nil {
		t.Fatalf("failed to create admin membership: %v", err)
	}

	t.Log("✅ Organization created")

	// ==================================================
	// 7. Create 5 events
	// ==================================================

	eventIDs := make([]int64, 0, 5)

	for i := 1; i <= 5; i++ {

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
				$2,
				$3,
				'Chandigarh',
				100,
				'published',
				NOW() + ($4 * INTERVAL '1 second'),
				NOW() + ($4 * INTERVAL '1 second')
			)
			RETURNING id
			`,
			organizationID,
			fmt.Sprintf("Pagination Event %d", i),
			fmt.Sprintf("Pagination test event %d", i),
			i,
		).Scan(&eventID)

		if err != nil {
			t.Fatalf(
				"failed to create event %d: %v",
				i,
				err,
			)
		}

		eventIDs = append(
			eventIDs,
			eventID,
		)
	}

	t.Logf(
		"✅ Created %d events",
		len(eventIDs),
	)

	// ==================================================
	// 8. Create 5 registrations for SAME user
	//    but different events
	// ==================================================

	for i, eventID := range eventIDs {

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
				$1,
				$2,
				'pending',
				'unpaid',
				NOW() + ($3 * INTERVAL '1 second')
			)
			`,
			userID,
			eventID,
			i,
		)

		if err != nil {
			t.Fatalf(
				"failed to create registration %d: %v",
				i+1,
				err,
			)
		}
	}

	t.Log("✅ Created 5 registrations")

	// ==================================================
	// 9. Create 5 notifications
	// ==================================================

	for i := 1; i <= 5; i++ {

		_, err = db.Exec(
			ctx,
			`
			INSERT INTO notifications (
				user_id,
				type,
				message,
				status,
				created_at
			)
			VALUES (
				$1,
				$2,
				$3,
				'unread',
				NOW() + ($4 * INTERVAL '1 second')
			)
			`,
			userID,
			"TEST",
			fmt.Sprintf(
				"Pagination notification %d",
				i,
			),
			i,
		)

		if err != nil {
			t.Fatalf(
				"failed to create notification %d: %v",
				i,
				err,
			)
		}
	}

	t.Log("✅ Created 5 notifications")

	// ==================================================
	// 10. Router
	// ==================================================

	r := SetupRouter(
		db,
		cfg,
		redisClient,
	)

	t.Log("✅ Router created")

	// ==================================================
	// 11. JWT
	// ==================================================

	token := jwt.NewWithClaims(
		jwt.SigningMethodHS256,
		jwt.MapClaims{
			"user_id": userID,
			"email":   "pagination-user@test.com",
			"role":    "user",
			"auth_version": 1,
			"exp":     time.Now().
				Add(time.Hour).
				Unix(),
		},
	)

	accessToken, err := token.SignedString(
		[]byte(cfg.JWTSecret),
	)

	if err != nil {
		t.Fatalf(
			"failed to create JWT: %v",
			err,
		)
	}

	// ==================================================
	// 12. My Registrations pagination
	// ==================================================

	req := httptest.NewRequest(
		http.MethodGet,
		"/api/v1/registrations/me?page=1&limit=2",
		nil,
	)

	req.Header.Set(
		"Authorization",
		"Bearer "+accessToken,
	)

	rec := httptest.NewRecorder()

	r.ServeHTTP(
		rec,
		req,
	)

	t.Logf(
		"MY REGISTRATIONS → status=%d body=%s",
		rec.Code,
		rec.Body.String(),
	)

	if rec.Code != http.StatusOK {
		t.Fatalf(
			"registrations/me expected 200, got %d body=%s",
			rec.Code,
			rec.Body.String(),
		)
	}

	body := rec.Body.String()

	if !strings.Contains(body, `"page":1`) {
		t.Fatalf(
			"registrations response missing page=1: %s",
			body,
		)
	}

	if !strings.Contains(body, `"limit":2`) {
		t.Fatalf(
			"registrations response missing limit=2: %s",
			body,
		)
	}

	if !strings.Contains(body, `"total":5`) {
		t.Fatalf(
			"registrations response missing total=5: %s",
			body,
		)
	}

	if !strings.Contains(body, `"total_pages":3`) {
		t.Fatalf(
			"registrations response missing total_pages=3: %s",
			body,
		)
	}

	t.Log(
		"✅ My Registrations pagination passed",
	)

	// ==================================================
	// 13. Event registrations pagination
	//
	// Since each event has one attendee in this setup,
	// verify pagination metadata rather than total=5.
	// ==================================================

	req = httptest.NewRequest(
		http.MethodGet,
		"/api/v1/events/"+
			strconv.FormatInt(eventIDs[0], 10)+
			"/registrations?page=1&limit=2",
		nil,
	)

	req.Header.Set(
		"Authorization",
		"Bearer "+accessToken,
	)

	rec = httptest.NewRecorder()

	r.ServeHTTP(
		rec,
		req,
	)

	t.Logf(
		"EVENT REGISTRATIONS → status=%d body=%s",
		rec.Code,
		rec.Body.String(),
	)

	if rec.Code != http.StatusOK {
		t.Fatalf(
			"event registrations expected 200, got %d body=%s",
			rec.Code,
			rec.Body.String(),
		)
	}

	body = rec.Body.String()

	if !strings.Contains(body, `"page":1`) {
		t.Fatalf(
			"event registrations missing page=1: %s",
			body,
		)
	}

	if !strings.Contains(body, `"limit":2`) {
		t.Fatalf(
			"event registrations missing limit=2: %s",
			body,
		)
	}

	t.Log(
		"✅ Event Registrations pagination passed",
	)

	// ==================================================
	// 14. Notifications pagination
	// ==================================================

	req = httptest.NewRequest(
		http.MethodGet,
		"/api/v1/notifications?page=1&limit=2",
		nil,
	)

	req.Header.Set(
		"Authorization",
		"Bearer "+accessToken,
	)

	rec = httptest.NewRecorder()

	r.ServeHTTP(
		rec,
		req,
	)

	t.Logf(
		"NOTIFICATIONS → status=%d body=%s",
		rec.Code,
		rec.Body.String(),
	)

	if rec.Code != http.StatusOK {
		t.Fatalf(
			"notifications expected 200, got %d body=%s",
			rec.Code,
			rec.Body.String(),
		)
	}

	body = rec.Body.String()

	if !strings.Contains(body, `"page":1`) {
		t.Fatalf(
			"notifications missing page=1: %s",
			body,
		)
	}

	if !strings.Contains(body, `"limit":2`) {
		t.Fatalf(
			"notifications missing limit=2: %s",
			body,
		)
	}

	if !strings.Contains(body, `"total":5`) {
		t.Fatalf(
			"notifications missing total=5: %s",
			body,
		)
	}

	if !strings.Contains(body, `"total_pages":3`) {
		t.Fatalf(
			"notifications missing total_pages=3: %s",
			body,
		)
	}

	t.Log(
		"✅ Notifications pagination passed",
	)

	// ==================================================
	// 15. Verify page 2 works
	// ==================================================

	req = httptest.NewRequest(
		http.MethodGet,
		"/api/v1/notifications?page=2&limit=2",
		nil,
	)

	req.Header.Set(
		"Authorization",
		"Bearer "+accessToken,
	)

	rec = httptest.NewRecorder()

	r.ServeHTTP(
		rec,
		req,
	)

	if rec.Code != http.StatusOK {
		t.Fatalf(
			"notifications page 2 expected 200, got %d body=%s",
			rec.Code,
			rec.Body.String(),
		)
	}

	if !strings.Contains(
		rec.Body.String(),
		`"page":2`,
	) {
		t.Fatalf(
			"notifications page 2 missing page=2: %s",
			rec.Body.String(),
		)
	}

	t.Log(
		"✅ Notifications page 2 passed",
	)

	t.Log(
		"✅ All pagination integration tests passed",
	)
}