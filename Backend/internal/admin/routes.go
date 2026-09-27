package admin

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// RegisterAdminRoutes wires the platform-owner endpoints.
// Every route requires a valid JWT plus the platform-level
// "platform_owner" role.
func RegisterAdminRoutes(
	api *gin.RouterGroup,
	handler *Handler,
	authMiddleware gin.HandlerFunc,
) {
	admin := api.Group("/admin")

	admin.Use(authMiddleware)
	admin.Use(requirePlatformOwner())

	admin.GET("/stats", handler.GetStats)
	admin.GET("/organizations", handler.ListOrganizations)
	admin.GET("/users", handler.ListUsers)
}

func requirePlatformOwner() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.GetString("role") != "platform_owner" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "platform owner access required",
			})
			return
		}

		c.Next()
	}
}