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

func TestCancelRegistrationPromotesWaitlistedUser(t *testing.T) {

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

	// Clean notification queue from previous tests.
	if err := redisClient.Del(
		ctx,
		"notification_queue",
	).Err(); err != nil {
		t.Fatalf("failed to clear notification queue: %v", err)
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
	// 8. Create User A
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
			'promotion-a@test.com',
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
		t.Fatalf("failed to create User A: %v", err)
	}

	// ==================================================
	// 9. Create User B
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
			'promotion-b@test.com',
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
		t.Fatalf("failed to create User B: %v", err)
	}

	// ==================================================
	// 10. Organization
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
			'Promotion Integration Org',
			'Testing promotion flow',
			NOW(),
			NOW()
		)
		RETURNING id
		`,
		userAID,
	).Scan(&organizationID)

	if err != nil {
		t.Fatalf("failed to create organization: %v", err)
	}

	// ==================================================
	// 11. Event
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
			'Promotion Integration Event',
			'Testing cancellation and promotion',
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
		t.Fatalf("failed to create event: %v", err)
	}

	// ==================================================
	// 12. User A registration
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
		t.Fatalf("failed to create registration: %v", err)
	}

	// ==================================================
	// 13. User B waitlist
	// ==================================================

	_, err = db.Exec(
		ctx,
		`
		INSERT INTO waitlist (
			user_id,
			event_id,
			position,
			created_at
		)
		VALUES (
			$1,
			$2,
			1,
			NOW()
		)
		`,
		userBID,
		eventID,
	)

	if err != nil {
		t.Fatalf("failed to create waitlist entry: %v", err)
	}

	// ==================================================
	// 14. Router
	// ==================================================

	r := SetupRouter(
		db,
		cfg,
		redisClient,
	)

	t.Log("✅ Router created")

	// ==================================================
	// 15. JWT for User A
	// ==================================================

	claims := jwt.MapClaims{
		"user_id":      userAID,
		"email":        "promotion-a@test.com",
		"role":         "user",
		"auth_version": 1,
		"exp":          time.Now().Add(time.Hour).Unix(),
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
	// 16. Cancel registration
	// ==================================================

	url := "/api/v1/registrations/" +
		strconv.FormatInt(registrationID, 10)

	req := httptest.NewRequest(
		http.MethodDelete,
		url,
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
	// 17. Verify A cancelled
	// ==================================================

	var userAStatus string

	err = db.QueryRow(
		ctx,
		`
		SELECT status
		FROM registrations
		WHERE id = $1
		`,
		registrationID,
	).Scan(&userAStatus)

	if err != nil {
		t.Fatalf("failed to query registration: %v", err)
	}

	if userAStatus != "cancelled" {
		t.Fatalf(
			"expected cancelled, got %s",
			userAStatus,
		)
	}

	t.Log("✅ User A registration cancelled")

	// ==================================================
	// 18. Verify B promoted
	// ==================================================

	var userBRegistrationCount int

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
	).Scan(&userBRegistrationCount)

	if err != nil {
		t.Fatalf(
			"failed to check User B registration: %v",
			err,
		)
	}

	if userBRegistrationCount != 1 {
		t.Fatalf(
			"expected User B to have 1 active registration, got %d",
			userBRegistrationCount,
		)
	}

	t.Log("✅ User B promoted to registration")

	// ==================================================
	// 19. Verify B removed from waitlist
	// ==================================================

	var remainingWaitlist int

	err = db.QueryRow(
		ctx,
		`
		SELECT COUNT(*)
		FROM waitlist
		WHERE user_id = $1
		  AND event_id = $2
		`,
		userBID,
		eventID,
	).Scan(&remainingWaitlist)

	if err != nil {
		t.Fatalf("failed to check waitlist: %v", err)
	}

	if remainingWaitlist != 0 {
		t.Fatalf(
			"expected User B to be removed from waitlist, got %d",
			remainingWaitlist,
		)
	}

	t.Log("✅ User B removed from waitlist")

	// ==================================================
	// 20. Verify Outbox event
	// ==================================================

	var outboxID int64

	for i := 0; i < 50; i++ {

		err = db.QueryRow(
			ctx,
			`
			SELECT id
			FROM outbox_events
			WHERE event_type = 'NOTIFICATION'
			  AND aggregate_type = 'registration'
			  AND payload->>'user_id' = $1
			  AND payload->>'type' = 'WAITLIST_PROMOTED'
			ORDER BY id DESC
			LIMIT 1
			`,
			strconv.FormatInt(userBID, 10),
		).Scan(&outboxID)

		if err == nil {
			break
		}

		time.Sleep(100 * time.Millisecond)
	}

	if outboxID == 0 {
		t.Fatal("expected WAITLIST_PROMOTED outbox event")
	}

	t.Logf(
		"✅ WAITLIST_PROMOTED outbox event created: id=%d",
		outboxID,
	)

	// ==================================================
	// 21. Verify Outbox processed
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
			"expected outbox event to be processed, got %s",
			outboxStatus,
		)
	}

	t.Log("✅ Outbox event processed")

	// ==================================================
	// 22. Verify notification
	// ==================================================

	var notificationCount int

	for i := 0; i < 50; i++ {

		err = db.QueryRow(
			ctx,
			`
			SELECT COUNT(*)
			FROM notifications
			WHERE user_id = $1
			  AND type = 'WAITLIST_PROMOTED'
			`,
			userBID,
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
			"expected exactly 1 WAITLIST_PROMOTED notification, got %d",
			notificationCount,
		)
	}

	t.Log(
		"✅ WAITLIST_PROMOTED notification processed",
	)

	t.Log(
		"✅ Full cancellation → promotion → outbox → notification flow passed",
	)
}