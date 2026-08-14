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
	"github.com/AkshatShrivastava0104/EventFlow/internal/config"
	"github.com/AkshatShrivastava0104/EventFlow/internal/event"
	"github.com/AkshatShrivastava0104/EventFlow/internal/organization"
	"github.com/AkshatShrivastava0104/EventFlow/internal/registration"
	"github.com/AkshatShrivastava0104/EventFlow/internal/waitlist"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

func SetupRouter(db *pgxpool.Pool, cfg *config.Config) *gin.Engine {

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




	registrationRepo := registration.NewRepository(db)

	registrationService := registration.NewService(
		registrationRepo,
		eventService,
		organizationService,
	)

	registrationHandler := registration.NewHandler(
		registrationService,
	)

	registration.RegisterRegistrationRoutes(
		api,
		registrationHandler,
		authMiddleware,
	)




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



	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "healthy",
		})
	})

	return r
}