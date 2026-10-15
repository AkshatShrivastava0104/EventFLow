package auth

import "github.com/gin-gonic/gin"

func RegisterAuthRoutes(
	api *gin.RouterGroup,
	handler *Handler,
	authMiddleware gin.HandlerFunc,
	authRateLimit gin.HandlerFunc,
) {
	auth := api.Group("/auth")

	auth.POST("/register", handler.Register)
	auth.POST("/login", authRateLimit, handler.Login)

	auth.GET("/me", authMiddleware, handler.Me)
	auth.PATCH("/me", authMiddleware, handler.UpdateProfile)
	auth.POST("/change-password", authMiddleware, handler.ChangePassword)

	auth.POST("/refresh", authRateLimit, handler.Refresh)
	auth.POST("/logout", handler.Logout)
}
