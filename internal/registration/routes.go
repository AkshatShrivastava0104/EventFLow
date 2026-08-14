package registration

import "github.com/gin-gonic/gin"

func RegisterRegistrationRoutes(
	api *gin.RouterGroup,
	handler *Handler,
	authMiddleware gin.HandlerFunc,
) {

	registrations := api.Group("/registrations")
	registrations.Use(authMiddleware)

	registrations.GET("/me", handler.GetMyRegistrations)
	registrations.DELETE("/:id", handler.CancelRegistration)

	events := api.Group("/events")
	events.Use(authMiddleware)

	events.POST("/:id/register", handler.Register)
}