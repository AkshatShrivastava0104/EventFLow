package notification

import "github.com/gin-gonic/gin"

func RegisterNotificationRoutes(
	api *gin.RouterGroup,
	handler *Handler,
	authMiddleware gin.HandlerFunc,
) {
	notifications := api.Group("/notifications")
	notifications.Use(authMiddleware)

	// User + Platform Owner notifications.
	// The authenticated user's own notifications are returned.
	notifications.GET(
		"",
		handler.GetMyNotifications,
	)

	notifications.GET(
		"/unread-count",
		handler.GetUnreadCount,
	)

	notifications.PATCH(
		"/read-all",
		handler.MarkAllAsRead,
	)

	notifications.PATCH(
		"/:id/read",
		handler.MarkAsRead,
	)
}