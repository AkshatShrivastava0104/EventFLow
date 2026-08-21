package event

import "github.com/gin-gonic/gin"

func RegisterEventRoutes(
	api *gin.RouterGroup,
	handler *Handler,
	authMiddleware gin.HandlerFunc,
) {
	organizationEvents := api.Group("/organizations/:id/events")
	organizationEvents.Use(authMiddleware)

	organizationEvents.POST("", handler.CreateEvent)
	organizationEvents.GET("", handler.GetEvents)

	events := api.Group("/events")
	events.Use(authMiddleware)

	events.GET("/:id", handler.GetEventByID)

	events.PATCH("/:id", handler.UpdateEvent)

	events.DELETE("/:id", handler.DeleteEvent)

	events.POST("/:id/publish", handler.PublishEvent)

	events.POST("/:id/cancel", handler.CancelEvent)

	events.POST("/:id/complete", handler.CompleteEvent)
}