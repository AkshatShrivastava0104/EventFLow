package router

import (
	"context"
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

func TestTicketAndCheckinFlow(t *testing.T) {

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
		t.Fatalf("failed to ping test db: %v", err)
	}

	// ==================================================
	// 2. Clean database
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
		t.Fatalf("failed to clean test db: %v", err)
	}

	// ==================================================
	// 3. Redis
	// ==================================================

	redisClient := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})

	defer redisClient.Close()

	if err := redisClient.Ping(ctx).Err(); err != nil {
		t.Fatalf("failed to connect to Redis: %v", err)
	}

	// ==================================================
	// 4. Config
	// ==================================================

	cfg := &config.Config{
		JWTSecret: "integration-test-secret",
	}

	// ==================================================
	// 5. Create attendee
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
			'Attendee',
			'attendee@test.com',
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
		t.Fatalf("failed to create attendee: %v", err)
	}

	// ==================================================
	// 6. Create volunteer
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
			'Volunteer',
			'volunteer@test.com',
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
		t.Fatalf("failed to create volunteer: %v", err)
	}

	// ==================================================
	// 7. Organization
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
			'Ticket Checkin Org',
			'Integration test organization',
			NOW(),
			NOW()
		)
		RETURNING id
		`,
		volunteerID,
	).Scan(&organizationID)

	if err != nil {
		t.Fatalf("failed to create organization: %v", err)
	}

	// Owner membership.
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
	// 8. Event
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
			'Ticket Checkin Event',
			'Ticket and checkin integration test',
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

	// ==================================================
	// 9. Registration
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
		t.Fatalf("failed to create registration: %v", err)
	}

	// ==================================================
	// 10. Router
	// ==================================================

	r := SetupRouter(
		db,
		cfg,
		redisClient,
	)

	// ==================================================
	// 11. Attendee JWT
	// ==================================================

	attendeeClaims := jwt.MapClaims{
		"user_id": attendeeID,
		"email":   "attendee@test.com",
		"role":    "user",
		"exp":     time.Now().Add(time.Hour).Unix(),
	}

	attendeeJWT := jwt.NewWithClaims(
		jwt.SigningMethodHS256,
		attendeeClaims,
	)

	attendeeToken, err := attendeeJWT.SignedString(
		[]byte(cfg.JWTSecret),
	)

	if err != nil {
		t.Fatalf(
			"failed to create attendee JWT: %v",
			err,
		)
	}

	// ==================================================
	// 12. Create ticket
	// ==================================================

	ticketURL := "/api/v1/registrations/" +
		strconv.FormatInt(registrationID, 10) +
		"/ticket"

	ticketReq := httptest.NewRequest(
		http.MethodPost,
		ticketURL,
		nil,
	)

	ticketReq.Header.Set(
		"Authorization",
		"Bearer "+attendeeToken,
	)

	ticketReq.Header.Set(
		"Content-Type",
		"application/json",
	)

	ticketRecorder := httptest.NewRecorder()

	r.ServeHTTP(
		ticketRecorder,
		ticketReq,
	)

	if ticketRecorder.Code != http.StatusCreated {
		t.Fatalf(
			"expected ticket status %d, got %d, body=%s",
			http.StatusCreated,
			ticketRecorder.Code,
			ticketRecorder.Body.String(),
		)
	}

	t.Log(
		"✅ Ticket creation passed",
	)

	// ==================================================
	// 13. Read ticket from DB
	// ==================================================

	var (
		ticketID     int64
		ticketNumber string
		qrCode       string
	)

	err = db.QueryRow(
		ctx,
		`
		SELECT
			id,
			ticket_number,
			qr_code
		FROM tickets
		WHERE registration_id = $1
		`,
		registrationID,
	).Scan(
		&ticketID,
		&ticketNumber,
		&qrCode,
	)

	if err != nil {
		t.Fatalf(
			"failed to fetch ticket: %v",
			err,
		)
	}

	if ticketNumber == "" {
		t.Fatal("ticket number is empty")
	}

	if qrCode == "" {
		t.Fatal("QR code is empty")
	}

	// ==================================================
	// 14. Volunteer JWT
	// ==================================================

	volunteerClaims := jwt.MapClaims{
		"user_id": volunteerID,
		"email":   "volunteer@test.com",
		"role":    "user",
		"exp":     time.Now().Add(time.Hour).Unix(),
	}

	volunteerJWT := jwt.NewWithClaims(
		jwt.SigningMethodHS256,
		volunteerClaims,
	)

	volunteerToken, err := volunteerJWT.SignedString(
		[]byte(cfg.JWTSecret),
	)

	if err != nil {
		t.Fatalf(
			"failed to create volunteer JWT: %v",
			err,
		)
	}

	// ==================================================
	// 15. Check-in
	// ==================================================

	checkinURL := "/api/v1/events/" +
		strconv.FormatInt(eventID, 10) +
		"/checkin"

	checkinBody := `{
		"ticket_number":"` + ticketNumber + `"
	}`

	checkinReq := httptest.NewRequest(
		http.MethodPost,
		checkinURL,
		strings.NewReader(checkinBody),
	)

	checkinReq.Header.Set(
		"Authorization",
		"Bearer "+volunteerToken,
	)

	checkinReq.Header.Set(
		"Content-Type",
		"application/json",
	)

	checkinRecorder := httptest.NewRecorder()

	r.ServeHTTP(
		checkinRecorder,
		checkinReq,
	)

	if checkinRecorder.Code != http.StatusCreated {
		t.Fatalf(
			"expected check-in status %d, got %d, body=%s",
			http.StatusCreated,
			checkinRecorder.Code,
			checkinRecorder.Body.String(),
		)
	}

	t.Log(
		"✅ First check-in passed",
	)

	// ==================================================
	// 16. Verify DB check-in
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
			"failed to verify check-in: %v",
			err,
		)
	}

	if checkinCount != 1 {
		t.Fatalf(
			"expected exactly 1 check-in, got %d",
			checkinCount,
		)
	}

	// ==================================================
	// 17. Duplicate check-in must return 409
	// ==================================================

	duplicateReq := httptest.NewRequest(
		http.MethodPost,
		checkinURL,
		strings.NewReader(checkinBody),
	)

	duplicateReq.Header.Set(
		"Authorization",
		"Bearer "+volunteerToken,
	)

	duplicateReq.Header.Set(
		"Content-Type",
		"application/json",
	)

	duplicateRecorder := httptest.NewRecorder()

	r.ServeHTTP(
		duplicateRecorder,
		duplicateReq,
	)

	t.Logf(
		"DUPLICATE CHECKIN → status=%d body=%s",
		duplicateRecorder.Code,
		duplicateRecorder.Body.String(),
	)

	if duplicateRecorder.Code != http.StatusConflict {
		t.Fatalf(
			"expected duplicate check-in status %d, got %d, body=%s",
			http.StatusConflict,
			duplicateRecorder.Code,
			duplicateRecorder.Body.String(),
		)
	}

	// ==================================================
	// 18. Verify no duplicate DB row
	// ==================================================

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
			"failed to verify duplicate protection: %v",
			err,
		)
	}

	if checkinCount != 1 {
		t.Fatalf(
			"expected exactly 1 check-in after duplicate attempt, got %d",
			checkinCount,
		)
	}

	t.Log(
		"✅ Duplicate check-in correctly rejected with 409",
	)

	t.Log(
		"✅ Ticket → Check-in → Duplicate protection flow passed",
	)
}