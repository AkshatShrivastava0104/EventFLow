package router

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

	"github.com/AkshatShrivastava0104/EventFlow/internal/config"
	"github.com/AkshatShrivastava0104/EventFlow/internal/notification"
	"github.com/AkshatShrivastava0104/EventFlow/internal/outbox"
	"github.com/AkshatShrivastava0104/EventFlow/internal/queue"
	"github.com/AkshatShrivastava0104/EventFlow/internal/worker"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

func TestRegistrationUsesOutboxForNotification(t *testing.T) {

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
			outbox_events,
			users
		RESTART IDENTITY CASCADE
	`)

	if err != nil {
		t.Fatalf("failed to clean database: %v", err)
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
		t.Fatalf("failed to connect to Redis: %v", err)
	}

	// Clear any jobs from previous test runs.
	if err := redisClient.Del(
		ctx,
		"notification_queue",
	).Err(); err != nil {
		t.Fatalf(
			"failed to clear notification queue: %v",
			err,
		)
	}

	t.Log("✅ Redis connected and queue cleared")

	// ==================================================
	// 4. Config
	// ==================================================

	cfg := &config.Config{
		JWTSecret: "integration-test-secret",
	}

	// ==================================================
	// 5. Notification service + worker
	// ==================================================

	notificationRepo := notification.NewRepository(db)

	notificationService := notification.NewService(
		notificationRepo,
	)

	workerCtx, cancelWorkers := context.WithCancel(ctx)
	defer cancelWorkers()

	notificationWorker := worker.NewNotificationWorker(
		redisClient,
		notificationService,
	)

	go notificationWorker.Start(workerCtx)

	t.Log("✅ Notification worker started")

	// ==================================================
	// 6. Outbox service + worker
	// ==================================================

	outboxRepo := outbox.NewRepository(db)

	notificationQueue := queue.NewNotificationQueue(
		redisClient,
	)

	outboxService := outbox.NewService(
		outboxRepo,
		notificationQueue,
	)

	outboxWorker := outbox.NewWorker(
		outboxService,
	)

	go outboxWorker.Start(workerCtx)

	t.Log("✅ Outbox worker started")

	// ==================================================
	// 7. Create user
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
			'Outbox User',
			'outbox@test.com',
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
	// 8. Create organization
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
			'Outbox Test Organization',
			'Testing outbox pattern',
			NOW(),
			NOW()
		)
		RETURNING id
		`,
		userID,
	).Scan(&organizationID)

	if err != nil {
		t.Fatalf(
			"failed to create organization: %v",
			err,
		)
	}

	// ==================================================
	// 9. Create published event
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
			'Outbox Test Event',
			'Testing registration outbox',
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

	t.Logf(
		"✅ Event created: event_id=%d",
		eventID,
	)

	// ==================================================
	// 10. Create router
	// ==================================================

	r := SetupRouter(
		db,
		cfg,
		redisClient,
	)

	t.Log("✅ Router created")

	// ==================================================
	// 11. Create JWT
	// ==================================================

	claims := jwt.MapClaims{
		"user_id": userID,
		"email":   "outbox@test.com",
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
		t.Fatalf("failed to create JWT: %v", err)
	}

	// ==================================================
	// 12. Register user through API
	// ==================================================

	registerURL := "/api/v1/events/" +
		strconv.FormatInt(eventID, 10) +
		"/register"

	req := httptest.NewRequest(
		http.MethodPost,
		registerURL,
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

	r.ServeHTTP(
		recorder,
		req,
	)

	t.Logf(
		"REGISTER RESPONSE → status=%d body=%s",
		recorder.Code,
		recorder.Body.String(),
	)

	if recorder.Code != http.StatusCreated {
		t.Fatalf(
			"expected status %d, got %d, response=%s",
			http.StatusCreated,
			recorder.Code,
			recorder.Body.String(),
		)
	}

	// ==================================================
	// 13. Verify registration exists
	// ==================================================

	var registrationID int64

	err = db.QueryRow(
		ctx,
		`
		SELECT id
		FROM registrations
		WHERE user_id = $1
		  AND event_id = $2
		  AND status != 'cancelled'
		ORDER BY id DESC
		LIMIT 1
		`,
		userID,
		eventID,
	).Scan(&registrationID)

	if err != nil {
		t.Fatalf(
			"failed to find registration: %v",
			err,
		)
	}

	t.Logf(
		"✅ Registration committed: registration_id=%d",
		registrationID,
	)

	// ==================================================
	// 14. Verify outbox event exists
	// ==================================================

	var outboxID int64

	err = db.QueryRow(
		ctx,
		`
		SELECT id
		FROM outbox_events
		WHERE event_type = 'NOTIFICATION'
		  AND aggregate_type = 'registration'
		  AND aggregate_id = $1
		ORDER BY id DESC
		LIMIT 1
		`,
		strconv.FormatInt(registrationID, 10),
	).Scan(&outboxID)

	if err != nil {
		t.Fatalf(
			"failed to find outbox event: %v",
			err,
		)
	}

	t.Logf(
		"✅ Outbox event created: outbox_id=%d",
		outboxID,
	)

	// ==================================================
	// 15. Wait for outbox worker to process event
	// ==================================================

	var outboxStatus string

	for i := 0; i < 50; i++ {

		err = db.QueryRow(
			ctx,
			`
			SELECT status
			FROM outbox_events
			WHERE id = $1
			`,
			outboxID,
		).Scan(&outboxStatus)

		if err != nil {
			t.Fatalf(
				"failed to read outbox status: %v",
				err,
			)
		}

		if outboxStatus == "processed" {
			break
		}

		time.Sleep(100 * time.Millisecond)
	}

	if outboxStatus != "processed" {
		t.Fatalf(
			"expected outbox event to be processed, got status %q",
			outboxStatus,
		)
	}

	t.Log("✅ Outbox event processed")

	// ==================================================
	// 16. Verify notification
	// ==================================================

	var notificationCount int

	for i := 0; i < 50; i++ {

		err = db.QueryRow(
			ctx,
			`
			SELECT COUNT(*)
			FROM notifications
			WHERE user_id = $1
			  AND type = 'REGISTRATION_CREATED'
			`,
			userID,
		).Scan(&notificationCount)

		if err != nil {
			t.Fatalf(
				"failed to check notification: %v",
				err,
			)
		}

		if notificationCount == 1 {
			break
		}

		time.Sleep(100 * time.Millisecond)
	}

	if notificationCount != 1 {
		t.Fatalf(
			"expected exactly 1 REGISTRATION_CREATED notification, got %d",
			notificationCount,
		)
	}

	// ==================================================
	// 17. Verify notification content
	// ==================================================

	var (
		notificationMessage string
		notificationStatus  string
	)

	err = db.QueryRow(
		ctx,
		`
		SELECT message, status
		FROM notifications
		WHERE user_id = $1
		  AND type = 'REGISTRATION_CREATED'
		ORDER BY id DESC
		LIMIT 1
		`,
		userID,
	).Scan(
		&notificationMessage,
		&notificationStatus,
	)

	if err != nil {
		t.Fatalf(
			"failed to fetch notification: %v",
			err,
		)
	}

	if notificationMessage == "" {
		t.Fatal("expected notification message, got empty")
	}

	if notificationStatus != "unread" {
		t.Fatalf(
			"expected notification status unread, got %q",
			notificationStatus,
		)
	}

	t.Log("✅ REGISTRATION_CREATED notification processed")
	t.Log("✅ Registration → Outbox → Redis → Worker → Notification flow passed")
}