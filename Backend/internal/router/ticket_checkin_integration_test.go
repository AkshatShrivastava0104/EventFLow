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
	// 6. Create second attendee
	// ==================================================

	var attendeeID2 int64

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
			'Attendee Two',
			'attendee-two@test.com',
			'test-password',
			'user',
			true,
			NOW(),
			NOW()
		)
		RETURNING id
		`,
	).Scan(&attendeeID2)
	if err != nil {
		t.Fatalf("failed to create second attendee: %v", err)
	}

	// ==================================================
	// 7. Create organization owner
	// ==================================================

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
			'Organization Owner',
			'owner@test.com',
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

	// ==================================================
	// 7. Create organization admin
	// ==================================================

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
			'Organization Admin',
			'admin@test.com',
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

	// ==================================================
	// 8. Create organization staff
	// ==================================================

	var staffID int64

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
			'Organization Staff',
			'staff@test.com',
			'test-password',
			'user',
			true,
			NOW(),
			NOW()
		)
		RETURNING id
		`,
	).Scan(&staffID)
	if err != nil {
		t.Fatalf("failed to create staff: %v", err)
	}

	// ==================================================
	// 9. Organization
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
		ownerID,
	).Scan(&organizationID)
	if err != nil {
		t.Fatalf("failed to create organization: %v", err)
	}

	// ADMIN membership.
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
		`,
		organizationID,
		adminID,
	)
	if err != nil {
		t.Fatalf("failed to create admin membership: %v", err)
	}

	// STAFF membership.
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
			'STAFF'
		)
		`,
		organizationID,
		staffID,
	)
	if err != nil {
		t.Fatalf("failed to create staff membership: %v", err)
	}

	// ==================================================
	// 10. Event
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
	// 11. Registration
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
	// 12. Router
	// ==================================================

	r := SetupRouter(
		db,
		cfg,
		redisClient,
	)

	// ==================================================
	// 13. JWT helper
	// ==================================================

	createToken := func(userID int64, email string) string {
		claims := jwt.MapClaims{
			"user_id":     userID,
			"email":       email,
			"role":        "user",
			"auth_version": 1,
			"exp":         time.Now().Add(time.Hour).Unix(),
		}

		token := jwt.NewWithClaims(
			jwt.SigningMethodHS256,
			claims,
		)

		signedToken, err := token.SignedString(
			[]byte(cfg.JWTSecret),
		)
		if err != nil {
			t.Fatalf(
				"failed to create JWT for %s: %v",
				email,
				err,
			)
		}

		return signedToken
	}

	attendeeToken := createToken(
		attendeeID,
		"attendee@test.com",
	)

	attendeeToken2 := createToken(
		attendeeID2,
		"attendee-two@test.com",
	)

	adminToken := createToken(
		adminID,
		"admin@test.com",
	)

	staffToken := createToken(
		staffID,
		"staff@test.com",
	)

	// ==================================================
	// 14. Create ticket
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

	t.Log("✅ Ticket creation passed")

	// ==================================================
	// 15. Read ticket from DB
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
	// 16. Check-in request helper
	// ==================================================

	checkinURL := "/api/v1/events/" +
		strconv.FormatInt(eventID, 10) +
		"/checkin"

	checkinBody := `{
		"ticket_number":"` + ticketNumber + `"
	}`

	doCheckin := func(token string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(
			http.MethodPost,
			checkinURL,
			strings.NewReader(checkinBody),
		)

		req.Header.Set(
			"Authorization",
			"Bearer "+token,
		)

		req.Header.Set(
			"Content-Type",
			"application/json",
		)

		recorder := httptest.NewRecorder()

		r.ServeHTTP(
			recorder,
			req,
		)

		return recorder
	}

	// ==================================================
	// 17. ADMIN check-in
	// ==================================================
	//
	// Service.go explicitly allows:
	// ADMIN and STAFF.
	//
	// Therefore ADMIN must receive 201 when the
	// ticket has not been checked in yet.

	adminRecorder := doCheckin(adminToken)

	if adminRecorder.Code != http.StatusCreated {
		t.Fatalf(
			"expected ADMIN check-in status %d, got %d, body=%s",
			http.StatusCreated,
			adminRecorder.Code,
			adminRecorder.Body.String(),
		)
	}

	t.Log("✅ ADMIN check-in passed")

	// ==================================================
	// 18. STAFF check-in on a different ticket
	// ==================================================
	//
	// The first ticket is already checked in by ADMIN.
	// A second attendee is used because the database
	// correctly allows only one active registration for
	// the same user/event pair.
	// ==================================================

	var registrationID2 int64

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
		attendeeID2,
		eventID,
	).Scan(&registrationID2)
	if err != nil {
		t.Fatalf(
			"failed to create second registration: %v",
			err,
		)
	}

	ticketURL2 := "/api/v1/registrations/" +
		strconv.FormatInt(registrationID2, 10) +
		"/ticket"

	ticketReq2 := httptest.NewRequest(
		http.MethodPost,
		ticketURL2,
		nil,
	)

	ticketReq2.Header.Set(
		"Authorization",
		"Bearer "+attendeeToken2,
	)

	ticketReq2.Header.Set(
		"Content-Type",
		"application/json",
	)

	ticketRecorder2 := httptest.NewRecorder()

	r.ServeHTTP(
		ticketRecorder2,
		ticketReq2,
	)

	if ticketRecorder2.Code != http.StatusCreated {
		t.Fatalf(
			"expected second ticket status %d, got %d, body=%s",
			http.StatusCreated,
			ticketRecorder2.Code,
			ticketRecorder2.Body.String(),
		)
	}

	var ticketNumber2 string

	err = db.QueryRow(
		ctx,
		`
		SELECT ticket_number
		FROM tickets
		WHERE registration_id = $1
		`,
		registrationID2,
	).Scan(&ticketNumber2)
	if err != nil {
		t.Fatalf(
			"failed to fetch second ticket: %v",
			err,
		)
	}

	checkinBody2 := `{
		"ticket_number":"` + ticketNumber2 + `"
	}`

	staffReq := httptest.NewRequest(
		http.MethodPost,
		checkinURL,
		strings.NewReader(checkinBody2),
	)

	staffReq.Header.Set(
		"Authorization",
		"Bearer "+staffToken,
	)

	staffReq.Header.Set(
		"Content-Type",
		"application/json",
	)

	staffRecorder := httptest.NewRecorder()

	r.ServeHTTP(
		staffRecorder,
		staffReq,
	)

	if staffRecorder.Code != http.StatusCreated {
		t.Fatalf(
			"expected STAFF check-in status %d, got %d, body=%s",
			http.StatusCreated,
			staffRecorder.Code,
			staffRecorder.Body.String(),
		)
	}

	t.Log("✅ STAFF check-in passed")

	// ==================================================
	// 19. Verify DB check-ins
	// ==================================================

	var checkinCount int

	err = db.QueryRow(
		ctx,
		`
		SELECT COUNT(*)
		FROM checkins
		WHERE ticket_id IN ($1, (
			SELECT id
			FROM tickets
			WHERE registration_id = $2
		))
		`,
		ticketID,
		registrationID2,
	).Scan(&checkinCount)
	if err != nil {
		t.Fatalf(
			"failed to verify check-ins: %v",
			err,
		)
	}

	if checkinCount != 2 {
		t.Fatalf(
			"expected exactly 2 check-ins, got %d",
			checkinCount,
		)
	}

	// ==================================================
	// 20. Duplicate check-in must return 409
	// ==================================================

	duplicateRecorder := doCheckin(adminToken)

	if duplicateRecorder.Code != http.StatusConflict {
		t.Fatalf(
			"expected duplicate check-in status %d, got %d, body=%s",
			http.StatusConflict,
			duplicateRecorder.Code,
			duplicateRecorder.Body.String(),
		)
	}

	t.Log("✅ Duplicate check-in correctly rejected with 409")

	// ==================================================
	// 21. Verify no duplicate DB row
	// ==================================================

	var firstTicketCheckins int

	err = db.QueryRow(
		ctx,
		`
		SELECT COUNT(*)
		FROM checkins
		WHERE ticket_id = $1
		`,
		ticketID,
	).Scan(&firstTicketCheckins)
	if err != nil {
		t.Fatalf(
			"failed to verify duplicate protection: %v",
			err,
		)
	}

	if firstTicketCheckins != 1 {
		t.Fatalf(
			"expected exactly 1 check-in for first ticket, got %d",
			firstTicketCheckins,
		)
	}

	t.Log("✅ Ticket → ADMIN/STAFF authorization → Duplicate protection flow passed")
}
