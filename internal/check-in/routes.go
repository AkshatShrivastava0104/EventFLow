package checkin

import "github.com/gin-gonic/gin"

func RegisterCheckinRoutes(
	api *gin.RouterGroup,
	handler *Handler,
	authMiddleware gin.HandlerFunc,
) {
	checkins := api.Group("/events")

	checkins.Use(authMiddleware)

	checkins.POST("/:id/checkin", handler.CheckIn)
}