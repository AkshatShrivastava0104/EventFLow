package auditlog

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(
	api *gin.RouterGroup,
	handler *Handler,
	authMiddleware gin.HandlerFunc,
) {
	audit := api.Group("/audit-logs")
	audit.Use(authMiddleware)

	// Platform-owner only.
	audit.Use(requirePlatformOwner())

	audit.GET("", handler.ListAuditLogs)
	audit.GET("/:id", handler.GetAuditLog)
}

func requirePlatformOwner() gin.HandlerFunc {
	return func(c *gin.Context) {
		role := strings.TrimSpace(
			strings.ToLower(c.GetString("role")),
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

func parseAuditLogID(c *gin.Context) (int64, bool) {
	rawID := strings.TrimSpace(c.Param("id"))

	id, err := strconv.ParseInt(rawID, 10, 64)
	if err != nil || id <= 0 {
		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"error": "invalid audit log id",
			},
		)
		return 0, false
	}

	return id, true
}