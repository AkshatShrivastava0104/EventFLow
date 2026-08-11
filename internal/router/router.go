

package router

import (
	"github.com/AkshatShrivastava0104/EventFlow/internal/organization"
	"github.com/AkshatShrivastava0104/EventFlow/internal/auth"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

func SetupRouter(db *pgxpool.Pool) *gin.Engine {

	r := gin.New()

	r.Use(gin.Logger())
	r.Use(gin.Recovery())

	api := r.Group("/api/v1")

	organizationRepo := organization.NewRepository(db)
	organizationService := organization.NewService(organizationRepo)
	organizationHandler := organization.NewHandler(organizationService)

	organization.RegisterAuthRoutes(
		api,
		organizationHandler,
		NewAuthMiddleware,
	)

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "healthy",
		})
	})

	return r
}