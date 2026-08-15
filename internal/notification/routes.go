package notification

import "github.com/gin-gonic/gin"

func RegisterNotificationRoutes(
	api *gin.RouterGroup,
	handler *Handler,
	authMiddleware gin.HandlerFunc,
) {
	notifications := api.Group("/notifications")

	notifications.Use(authMiddleware)

	notifications.GET("", handler.GetMyNotifications)
	notifications.PATCH("/:id/read", handler.MarkAsRead)
}