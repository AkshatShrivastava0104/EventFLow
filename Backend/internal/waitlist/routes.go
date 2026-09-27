package waitlist

import "github.com/gin-gonic/gin"

func RegisterWaitlistRoutes(
	api *gin.RouterGroup,
	handler *Handler,
	authMiddleware gin.HandlerFunc,
) {

	waitlist := api.Group("/events")

	waitlist.Use(authMiddleware)

	waitlist.POST("/:id/waitlist", handler.JoinWaitlist)
}