package ticket

import "github.com/gin-gonic/gin"

func RegisterTicketRoutes(
	api *gin.RouterGroup,
	handler *Handler,
	authMiddleware gin.HandlerFunc,
) {
	// Ticket creation for a registration.
	registrations := api.Group("/registrations")
	registrations.Use(authMiddleware)

	registrations.POST("/:id/ticket", handler.CreateTicket)

	// Attendee-facing ticket wallet.
	tickets := api.Group("/tickets")
	tickets.Use(authMiddleware)

	// Get all tickets belonging to the authenticated user.
	tickets.GET("/me", handler.GetMyTickets)

	// Get a single ticket by ID.
	tickets.GET("/:id", handler.GetTicketByID)
}