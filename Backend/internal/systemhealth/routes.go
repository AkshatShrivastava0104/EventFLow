package systemhealth

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(
	api *gin.RouterGroup,
	handler *Handler,
	authMiddleware gin.HandlerFunc,
) {
	health := api.Group("/system-health")

	health.Use(authMiddleware)
	health.Use(requirePlatformOwner())

	health.GET(
		"",
		handler.GetHealth,
	)
}

func requirePlatformOwner() gin.HandlerFunc {
	return func(c *gin.Context) {
		role := strings.TrimSpace(
			strings.ToLower(
				c.GetString("role"),
			),
		)

		if role != "platform_owner" && role != "owner" {
			c.AbortWithStatusJSON(
				http.StatusForbidden,
				gin.H{
					"error": "platform owner access required",
				},
			)
			return
		}

		c.Next()
	}
}