package stats

import (
	"github.com/gin-gonic/gin"
)

func RegisterStatsRoutes(
	api *gin.RouterGroup,
	handler *Handler,
	authMiddleware gin.HandlerFunc,
) {
	stats := api.Group("/stats")
	stats.Use(authMiddleware)

	// Platform owner dashboard
	stats.GET("/platform", handler.GetPlatformStats)

	// Organization admin/staff dashboard
	organizationStats := api.Group("/organizations/:id")
	organizationStats.Use(authMiddleware)

	organizationStats.GET(
		"/stats",
		handler.GetOrganizationStats,
	)

	// Staff operational dashboard
	organizationStats.GET(
		"/operations/stats",
		handler.GetStaffStats,
	)
}