// package router

// import (
// 	"github.com/AkshatShrivastava0104/EventFlow/internal/auth"
// 	"github.com/AkshatShrivastava0104/EventFlow/internal/config"
// 	"github.com/AkshatShrivastava0104/EventFlow/internal/organization"
// 	"github.com/gin-gonic/gin"
// 	"github.com/jackc/pgx/v5/pgxpool"
// )

// func SetupRouter(db *pgxpool.Pool, cfg *config.Config) *gin.Engine {

// 	r := gin.New()

// 	r.Use(gin.Logger())
// 	r.Use(gin.Recovery())

// 	api := r.Group("/api/v1")

// 	authRepo := auth.NewRepository(db)
// 	authService := auth.NewService(authRepo, cfg)
// 	authHandler := auth.NewHandler(authService)

// 	auth.RegisterAuthRoutes(api, authHandler, auth.NewAuthMiddleware(cfg))

// 	organizationRepo := organization.NewRepository(db)
// 	organizationService := organization.NewService(organizationRepo)
// 	organizationHandler := organization.NewHandler(organizationService)

// 	organization.RegisterOrganizationRoutes(api, organizationHandler, auth.NewAuthMiddleware(cfg))

// 	r.GET("/health", func(c *gin.Context) {
// 		c.JSON(200, gin.H{
// 			"status": "healthy",
// 		})
// 	})

// 	return r
// }

package router

import (
	"github.com/AkshatShrivastava0104/EventFlow/internal/auth"
	checkin "github.com/AkshatShrivastava0104/EventFlow/internal/check-in"
	"github.com/AkshatShrivastava0104/EventFlow/internal/config"
	"github.com/AkshatShrivastava0104/EventFlow/internal/event"
	"github.com/AkshatShrivastava0104/EventFlow/internal/notification"
	"github.com/AkshatShrivastava0104/EventFlow/internal/organization"
	"github.com/AkshatShrivastava0104/EventFlow/internal/queue"
	"github.com/AkshatShrivastava0104/EventFlow/internal/registration"
	"github.com/AkshatShrivastava0104/EventFlow/internal/ticket"
	"github.com/AkshatShrivastava0104/EventFlow/internal/waitlist"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

func SetupRouter(db *pgxpool.Pool, cfg *config.Config, redisClient *redis.Client) *gin.Engine {

	r := gin.New()

	r.Use(gin.Logger())
	r.Use(gin.Recovery())

	api := r.Group("/api/v1")

	authRepo := auth.NewRepository(db)

	authService := auth.NewService(
		authRepo,
		cfg,
	)

	authHandler := auth.NewHandler(authService)

	authMiddleware := auth.NewAuthMiddleware(cfg)

	auth.RegisterAuthRoutes(
		api,
		authHandler,
		authMiddleware,
	)


	organizationRepo := organization.NewRepository(db)

	organizationService := organization.NewService(
		organizationRepo,
	)

	organizationHandler := organization.NewHandler(
		organizationService,
	)

	organization.RegisterOrganizationRoutes(
		api,
		organizationHandler,
		authMiddleware,
	)

	


	eventRepo := event.NewRepository(db)
	eventService := event.NewService(eventRepo, organizationService)


	eventHandler := event.NewHandler(eventService)

	event.RegisterEventRoutes(api, eventHandler, authMiddleware)




	waitlistRepo := waitlist.NewRepository(db)

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


	registrationRepo := registration.NewRepository(db)

	notificationQueue := queue.NewNotificationQueue(redisClient)

	registrationService := registration.NewService(
		registrationRepo,
		eventService,
		organizationService,
		waitlistService,
		notificationQueue,
	)

	registrationHandler := registration.NewHandler(registrationService)

	registration.RegisterRegistrationRoutes(api, registrationHandler,authMiddleware)

	

	ticketRepo := ticket.NewRepository(db)

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




	checkinRepo := checkin.NewRepository(db)

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



	notificationRepo := notification.NewRepository(db)

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



	


	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "healthy",
		})
	})

	return r
}