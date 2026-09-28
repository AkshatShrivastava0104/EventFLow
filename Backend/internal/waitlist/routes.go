package waitlist

import "github.com/gin-gonic/gin"

func RegisterWaitlistRoutes(
	api *gin.RouterGroup,
	handler *Handler,
	authMiddleware gin.HandlerFunc,
) {
	// User-facing waitlist endpoint.
	waitlist := api.Group("/events")
	waitlist.Use(authMiddleware)

	waitlist.POST("/:id/waitlist", handler.JoinWaitlist)

	// Waitlist management endpoints are registered separately so the
	// router can apply platform-owner authorization to them.
}

func RegisterOwnerWaitlistRoutes(
	api *gin.RouterGroup,
	handler *Handler,
	authMiddleware gin.HandlerFunc,
) {
	owner := api.Group("/admin/waitlist")

	owner.Use(authMiddleware)
	owner.Use(requirePlatformOwner())

	owner.GET("", handler.ListOwnerWaitlist)

	// Promote the first person in a specific event's queue.
	owner.POST("/events/:id/promote", handler.PromoteNextUser)

	// Promote a specific waitlist entry. The service still enforces
	// queue order and capacity.
	owner.POST("/:id/promote", handler.PromoteUser)

	// Remove a specific attendee from the waitlist.
	owner.DELETE("/:id", handler.RemoveFromWaitlist)
}

func requirePlatformOwner() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.GetString("role") != "platform_owner" {
			c.AbortWithStatusJSON(403, gin.H{
				"error": "platform owner access required",
			})
			return
		}

		c.Next()
	}
}