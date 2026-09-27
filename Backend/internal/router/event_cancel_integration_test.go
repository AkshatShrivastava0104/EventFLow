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

func TestCancelEventNotifiesAllAttendees(t *testing.T) {

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
		t.Fatalf("failed to clean test db: %v", err)
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
	// 8. Create owner
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
			'Event Owner',
			'owner-cancel@test.com',
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
		t.Fatalf(
			"failed to create owner: %v",
			err,
		)
	}

	// ==================================================
	// 9. Create attendees
	// ==================================================

	const attendeeCount = 3

	attendeeIDs := make([]int64, 0, attendeeCount)

	for i := 1; i <= attendeeCount; i++ {

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
				$1,
				$2,
				'test-password',
				'user',
				true,
				NOW(),
				NOW()
			)
			RETURNING id
			`,
			"Cancel Attendee "+strconv.Itoa(i),
			"cancel-attendee"+strconv.Itoa(i)+"@test.com",
		).Scan(&attendeeID)

		if err != nil {
			t.Fatalf(
				"failed to create attendee %d: %v",
				i,
				err,
			)
		}

		attendeeIDs = append(
			attendeeIDs,
			attendeeID,
		)
	}

	t.Logf(
		"✅ Created owner=%d and %d attendees",
		ownerID,
		attendeeCount,
	)

	// ==================================================
	// 10. Create organization
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
			'Cancellation Test Org',
			'Testing event cancellation',
			NOW(),
			NOW()
		)
		RETURNING id
		`,
		ownerID,
	).Scan(&organizationID)

	if err != nil {
		t.Fatalf(
			"failed to create organization: %v",
			err,
		)
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
		ownerID,
	)

	if err != nil {
		t.Fatalf(
			"failed to create owner membership: %v",
			err,
		)
	}

	// ==================================================
	// 11. Create published event
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
			'Cancellation Integration Event',
			'Testing cancellation notifications',
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
	// 12. Register all attendees
	// ==================================================

	for _, attendeeID := range attendeeIDs {

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
				NOW()
			)
			`,
			attendeeID,
			eventID,
		)

		if err != nil {
			t.Fatalf(
				"failed to create registration for user %d: %v",
				attendeeID,
				err,
			)
		}
	}

	t.Log("✅ All attendees registered")

	// ==================================================
	// 13. Router
	// ==================================================

	r := SetupRouter(
		db,
		cfg,
		redisClient,
	)

	t.Log("✅ Router created")

	// ==================================================
	// 14. Owner JWT
	// ==================================================

	claims := jwt.MapClaims{
		"user_id": ownerID,
		"email":   "owner-cancel@test.com",
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
			"failed to create owner JWT: %v",
			err,
		)
	}

	// ==================================================
	// 15. Cancel event through HTTP API
	// ==================================================

	cancelURL := "/api/v1/events/" +
		strconv.FormatInt(eventID, 10) +
		"/cancel"

	req := httptest.NewRequest(
		http.MethodPost,
		cancelURL,
		nil,
	)

	req.Header.Set(
		"Authorization",
		"Bearer "+accessToken,
	)

	recorder := httptest.NewRecorder()

	r.ServeHTTP(
		recorder,
		req,
	)

	t.Logf(
		"CANCEL RESPONSE → status=%d body=%s",
		recorder.Code,
		recorder.Body.String(),
	)

	if recorder.Code != http.StatusOK {
		t.Fatalf(
			"expected status %d, got %d, response: %s",
			http.StatusOK,
			recorder.Code,
			recorder.Body.String(),
		)
	}

	// ==================================================
	// 16. Verify event cancelled
	// ==================================================

	var eventStatus string

	err = db.QueryRow(
		ctx,
		`
		SELECT status
		FROM events
		WHERE id = $1
		`,
		eventID,
	).Scan(&eventStatus)

	if err != nil {
		t.Fatalf(
			"failed to read event status: %v",
			err,
		)
	}

	if eventStatus != "cancelled" {
		t.Fatalf(
			"expected event status cancelled, got %s",
			eventStatus,
		)
	}

	t.Log("✅ Event status changed to cancelled")

	// ==================================================
	// 17. Verify outbox events
	// ==================================================

	var outboxCount int

	for i := 0; i < 50; i++ {

		err = db.QueryRow(
			ctx,
			`
			SELECT COUNT(*)
			FROM outbox_events
			WHERE event_type = 'NOTIFICATION'
			  AND aggregate_type = 'event'
			  AND aggregate_id = $1
		`,
			strconv.FormatInt(eventID, 10),
		).Scan(&outboxCount)

		if err != nil {
			t.Fatalf(
				"failed to count cancellation outbox events: %v",
				err,
			)
		}

		if outboxCount == attendeeCount {
			break
		}

		time.Sleep(100 * time.Millisecond)
	}

	if outboxCount != attendeeCount {
		t.Fatalf(
			"expected %d EVENT_CANCELLED outbox events, got %d",
			attendeeCount,
			outboxCount,
		)
	}

	t.Logf(
		"✅ %d cancellation outbox events created",
		outboxCount,
	)

	// ==================================================
	// 18. Wait for notifications
	// ==================================================

	var notificationCount int

	for i := 0; i < 50; i++ {

		err = db.QueryRow(
			ctx,
			`
			SELECT COUNT(*)
			FROM notifications
			WHERE type = 'EVENT_CANCELLED'
		`,
		).Scan(&notificationCount)

		if err != nil {
			t.Fatalf(
				"failed to count cancellation notifications: %v",
				err,
			)
		}

		if notificationCount == attendeeCount {
			break
		}

		time.Sleep(100 * time.Millisecond)
	}

	if notificationCount != attendeeCount {
		t.Fatalf(
			"expected %d EVENT_CANCELLED notifications, got %d",
			attendeeCount,
			notificationCount,
		)
	}

	t.Logf(
		"✅ %d EVENT_CANCELLED notifications processed",
		notificationCount,
	)

	// ==================================================
	// 19. Verify every attendee got exactly one
	// ==================================================

	for _, attendeeID := range attendeeIDs {

		var count int

		err = db.QueryRow(
			ctx,
			`
			SELECT COUNT(*)
			FROM notifications
			WHERE user_id = $1
			  AND type = 'EVENT_CANCELLED'
			`,
			attendeeID,
		).Scan(&count)

		if err != nil {
			t.Fatalf(
				"failed to verify notification for user %d: %v",
				attendeeID,
				err,
			)
		}

		if count != 1 {
			t.Fatalf(
				"expected exactly 1 notification for user %d, got %d",
				attendeeID,
				count,
			)
		}
	}

	t.Log(
		"✅ Every active attendee received exactly one cancellation notification",
	)

	// ==================================================
	// 20. Verify audit log
	// ==================================================

	var auditCount int

	err = db.QueryRow(
		ctx,
		`
		SELECT COUNT(*)
		FROM audit_logs
		WHERE user_id = $1
		  AND action = 'CANCEL_EVENT'
		  AND entity = 'event'
		  AND entity_id = $2
		`,
		ownerID,
		strconv.FormatInt(eventID, 10),
	).Scan(&auditCount)

	if err != nil {
		t.Fatalf(
			"failed to verify cancellation audit log: %v",
			err,
		)
	}

	if auditCount != 1 {
		t.Fatalf(
			"expected 1 CANCEL_EVENT audit log, got %d",
			auditCount,
		)
	}

	t.Log("✅ CANCEL_EVENT audit log created")

	t.Log(
		"✅ Full event cancellation → outbox → Redis → notifications flow passed",
	)
}