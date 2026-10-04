package payment

import "github.com/gin-gonic/gin"

func RegisterRoutes(
	api *gin.RouterGroup,
	handler *Handler,
	authMiddleware gin.HandlerFunc,
) {
	payments := api.Group("/payments")
	payments.Use(authMiddleware)
	payments.POST("/intents", handler.CreateIntent)
	payments.POST("/intents/:order_id/confirm", handler.Confirm)

	organizations := api.Group("/organizations")
	organizations.Use(authMiddleware)
	organizations.GET("/:id/payments", handler.ListOrganizationPayments)
}
