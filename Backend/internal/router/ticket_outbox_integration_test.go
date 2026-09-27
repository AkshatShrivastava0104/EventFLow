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

func TestTicketCreationUsesOutboxForNotification(t *testing.T) {

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
	// 2. Clean test DB
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
		t.Fatalf("failed to clean test database: %v", err)
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
	// 5. Worker context
	// ==================================================

	workerCtx, cancelWorkers := context.WithCancel(ctx)
	defer cancelWorkers()

	// ==================================================
	// 6. Notification Worker
	// ==================================================

	notificationRepo := notification.NewRepository(db)

	notificationService := notification.NewService(
		notificationRepo,
	)

	notificationWorker := worker.NewNotificationWorker(
		redisClient,
		notificationService,
	)

	go notificationWorker.Start(workerCtx)

	t.Log("✅ Notification worker started")

	// ==================================================
	// 7. Outbox Worker
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
	// 8. Create user
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
			'Ticket User',
			'ticket-outbox@test.com',
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

	// ==================================================
	// 9. Create organization
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
			'Ticket Outbox Organization',
			'Testing ticket outbox',
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
		VALUES (
			$1,
			$2,
			'OWNER'
		)
		ON CONFLICT DO NOTHING
		`,
		organizationID,
		userID,
	)

	if err != nil {
		t.Fatalf("failed to create owner membership: %v", err)
	}

	// ==================================================
	// 10. Create published event
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
			'Ticket Outbox Event',
			'Testing ticket outbox notification',
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
	// 11. Create registration
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
		userID,
		eventID,
	).Scan(&registrationID)

	if err != nil {
		t.Fatalf(
			"failed to create registration: %v",
			err,
		)
	}

	t.Logf(
		"✅ Registration created: id=%d",
		registrationID,
	)

	// ==================================================
	// 12. Router
	// ==================================================

	r := SetupRouter(
		db,
		cfg,
		redisClient,
	)

	t.Log("✅ Router created")

	// ==================================================
	// 13. JWT
	// ==================================================

	claims := jwt.MapClaims{
		"user_id": userID,
		"email":   "ticket-outbox@test.com",
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
	// 14. Create ticket through HTTP API
	// ==================================================

	ticketURL := "/api/v1/registrations/" +
		strconv.FormatInt(registrationID, 10) +
		"/ticket"

	req := httptest.NewRequest(
		http.MethodPost,
		ticketURL,
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
		"TICKET RESPONSE → status=%d body=%s",
		recorder.Code,
		recorder.Body.String(),
	)

	if recorder.Code != http.StatusCreated {
		t.Fatalf(
			"expected status %d, got %d, response: %s",
			http.StatusCreated,
			recorder.Code,
			recorder.Body.String(),
		)
	}

	// ==================================================
	// 15. Verify ticket exists
	// ==================================================

	var ticketID int64

	err = db.QueryRow(
		ctx,
		`
		SELECT id
		FROM tickets
		WHERE registration_id = $1
		ORDER BY id DESC
		LIMIT 1
		`,
		registrationID,
	).Scan(&ticketID)

	if err != nil {
		t.Fatalf(
			"failed to find created ticket: %v",
			err,
		)
	}

	t.Logf(
		"✅ Ticket created: ticket_id=%d",
		ticketID,
	)

	// ==================================================
	// 16. Verify outbox event exists
	// ==================================================

	var outboxID int64

	for i := 0; i < 50; i++ {

		err = db.QueryRow(
			ctx,
			`
			SELECT id
			FROM outbox_events
			WHERE event_type = 'NOTIFICATION'
			  AND aggregate_type = 'ticket'
			  AND aggregate_id = $1
			ORDER BY id DESC
			LIMIT 1
			`,
			strconv.FormatInt(ticketID, 10),
		).Scan(&outboxID)

		if err == nil {
			break
		}

		time.Sleep(100 * time.Millisecond)
	}

	if outboxID == 0 {
		t.Fatal(
			"expected TICKET_CREATED outbox event",
		)
	}

	t.Logf(
		"✅ TICKET_CREATED outbox event created: id=%d",
		outboxID,
	)

	// ==================================================
	// 17. Verify outbox processed
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
			"expected outbox status processed, got %s",
			outboxStatus,
		)
	}

	t.Log("✅ TICKET_CREATED outbox event processed")

	// ==================================================
	// 18. Verify notification
	// ==================================================

	var notificationCount int

	for i := 0; i < 50; i++ {

		err = db.QueryRow(
			ctx,
			`
			SELECT COUNT(*)
			FROM notifications
			WHERE user_id = $1
			  AND type = 'TICKET_CREATED'
			`,
			userID,
		).Scan(&notificationCount)

		if err != nil {
			t.Fatalf(
				"failed to count ticket notifications: %v",
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
			"expected exactly 1 TICKET_CREATED notification, got %d",
			notificationCount,
		)
	}

	// ==================================================
	// 19. Verify notification content
	// ==================================================

	var (
		message string
		status  string
	)

	err = db.QueryRow(
		ctx,
		`
		SELECT message, status
		FROM notifications
		WHERE user_id = $1
		  AND type = 'TICKET_CREATED'
		ORDER BY id DESC
		LIMIT 1
		`,
		userID,
	).Scan(
		&message,
		&status,
	)

	if err != nil {
		t.Fatalf(
			"failed to fetch ticket notification: %v",
			err,
		)
	}

	if message == "" {
		t.Fatal(
			"expected ticket notification message",
		)
	}

	if status != "unread" {
		t.Fatalf(
			"expected notification status unread, got %s",
			status,
		)
	}

	t.Log(
		"✅ TICKET_CREATED notification processed",
	)

	t.Log(
		"✅ Ticket → Outbox → Redis → Notification flow passed",
	)
}