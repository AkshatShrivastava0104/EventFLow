package router

import (
	"context"
	"net/http"
	"time"

	"github.com/AkshatShrivastava0104/EventFlow/internal/auditlog"
	"github.com/AkshatShrivastava0104/EventFlow/internal/auth"
	checkin "github.com/AkshatShrivastava0104/EventFlow/internal/check-in"
	"github.com/AkshatShrivastava0104/EventFlow/internal/config"
	"github.com/AkshatShrivastava0104/EventFlow/internal/event"
	"github.com/AkshatShrivastava0104/EventFlow/internal/notification"
	"github.com/AkshatShrivastava0104/EventFlow/internal/organization"
	"github.com/AkshatShrivastava0104/EventFlow/internal/outbox"
	"github.com/AkshatShrivastava0104/EventFlow/internal/queue"
	"github.com/AkshatShrivastava0104/EventFlow/internal/registration"
	"github.com/AkshatShrivastava0104/EventFlow/internal/ticket"
	"github.com/AkshatShrivastava0104/EventFlow/internal/waitlist"

	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

func SetupRouter(
	db *pgxpool.Pool,
	cfg *config.Config,
	redisClient *redis.Client,
) *gin.Engine {

	// ==================================================
	// Gin
	// ==================================================

	r := gin.New()

	r.Use(gin.Logger())
	r.Use(gin.Recovery())

	// ==================================================
	// API v1
	// ==================================================

	api := r.Group("/api/v1")

	// ==================================================
	// Auth
	// ==================================================

	authRepo := auth.NewRepository(db)

	authService := auth.NewService(
		authRepo,
		cfg,
	)

	authHandler := auth.NewHandler(
		authService,
	)

	authMiddleware := auth.NewAuthMiddleware(
		cfg,
	)

	auth.RegisterAuthRoutes(
		api,
		authHandler,
		authMiddleware,
	)

	// ==================================================
	// Audit Log
	// ==================================================

	auditRepo := auditlog.NewRepository(
		db,
	)

	auditService := auditlog.NewService(
		auditRepo,
	)

	// ==================================================
	// Organization
	// ==================================================

	organizationRepo := organization.NewRepository(
		db,
	)

	organizationService := organization.NewService(
		organizationRepo,
		auditService,
	)

	organizationHandler := organization.NewHandler(
		organizationService,
	)

	organization.RegisterOrganizationRoutes(
		api,
		organizationHandler,
		authMiddleware,
	)

	// ==================================================
	// Shared Infrastructure
	// ==================================================

	outboxRepo := outbox.NewRepository(
		db,
	)

	notificationQueue := queue.NewNotificationQueue(
		redisClient,
	)

	// ==================================================
	// Event
	// ==================================================

	eventRepo := event.NewRepository(
		db,
		outboxRepo,
	)

	eventService := event.NewService(
		eventRepo,
		organizationService,
		notificationQueue,
		auditService,
	)

	eventHandler := event.NewHandler(
		eventService,
	)

	event.RegisterEventRoutes(
		api,
		eventHandler,
		authMiddleware,
	)

	// ==================================================
	// Waitlist
	// ==================================================

	waitlistRepo := waitlist.NewRepository(
		db,
		outboxRepo,
	)

	waitlistService := waitlist.NewService(
		waitlistRepo,
		eventService,
		organizationService,
	)

	waitlistHandler := waitlist.NewHandler(
		waitlistService,
	)

	waitlist.RegisterWaitlistRoutes(
		api,
		waitlistHandler,
		authMiddleware,
	)

	// ==================================================
	// Notification
	// ==================================================

	notificationRepo := notification.NewRepository(
		db,
	)

	notificationService := notification.NewService(
		notificationRepo,
	)

	notificationHandler := notification.NewHandler(
		notificationService,
	)

	notification.RegisterNotificationRoutes(
		api,
		notificationHandler,
		authMiddleware,
	)

	// ==================================================
	// Registration
	// ==================================================

	registrationRepo := registration.NewRepository(
		db,
		outboxRepo,
	)

	registrationService := registration.NewService(
		registrationRepo,
		eventService,
		organizationService,
		waitlistService,
		notificationQueue,
	)

	registrationHandler := registration.NewHandler(
		registrationService,
	)

	registration.RegisterRegistrationRoutes(
		api,
		registrationHandler,
		authMiddleware,
	)

	// ==================================================
	// Ticket
	// ==================================================

	ticketRepo := ticket.NewRepository(
		db,
		outboxRepo,
	)

	ticketService := ticket.NewService(
		ticketRepo,
		registrationService,
	)

	ticketHandler := ticket.NewHandler(
		ticketService,
	)

	ticket.RegisterTicketRoutes(
		api,
		ticketHandler,
		authMiddleware,
	)

	// ==================================================
	// Check-in
	// ==================================================

	checkinRepo := checkin.NewRepository(
		db,
	)

	checkinService := checkin.NewService(
		checkinRepo,
		eventService,
		organizationService,
	)

	checkinHandler := checkin.NewHandler(
		checkinService,
	)

	checkin.RegisterCheckinRoutes(
		api,
		checkinHandler,
		authMiddleware,
	)

	// ==================================================
	// Liveness
	// ==================================================

	r.GET(
		"/health",
		func(c *gin.Context) {
			c.JSON(
				http.StatusOK,
				gin.H{
					"status": "healthy",
				},
			)
		},
	)

	// ==================================================
	// Readiness
	// ==================================================

	r.GET(
		"/ready",
		func(c *gin.Context) {

			ctx, cancel := context.WithTimeout(
				c.Request.Context(),
				2*time.Second,
			)
			defer cancel()

			// PostgreSQL
			if err := db.Ping(ctx); err != nil {
				c.JSON(
					http.StatusServiceUnavailable,
					gin.H{
						"status":   "not_ready",
						"database": "unhealthy",
						"redis":    "unknown",
					},
				)
				return
			}

			// Redis
			if err := redisClient.Ping(ctx).Err(); err != nil {
				c.JSON(
					http.StatusServiceUnavailable,
					gin.H{
						"status":   "not_ready",
						"database": "healthy",
						"redis":    "unhealthy",
					},
				)
				return
			}

			c.JSON(
				http.StatusOK,
				gin.H{
					"status":   "ready",
					"database": "healthy",
					"redis":    "healthy",
				},
			)
		},
	)

	// ==================================================
	// Swagger
	// ==================================================

	r.GET(
		"/swagger/*any",
		ginSwagger.WrapHandler(
			swaggerFiles.Handler,
		),
	)

	return r
}