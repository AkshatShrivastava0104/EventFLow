package ticket

import "github.com/gin-gonic/gin"

func RegisterTicketRoutes(
	api *gin.RouterGroup,
	handler *Handler,
	authMiddleware gin.HandlerFunc,
) {
	tickets := api.Group("/registrations")

	tickets.Use(authMiddleware)

	tickets.POST("/:id/ticket", handler.CreateTicket)
}