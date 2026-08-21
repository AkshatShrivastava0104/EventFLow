package auth

import "github.com/gin-gonic/gin"

func RegisterAuthRoutes(
	api *gin.RouterGroup,
	handler *Handler,
	authMiddleware gin.HandlerFunc,
) {
	auth := api.Group("/auth")

	auth.POST("/register", handler.Register)
	auth.POST("/login", handler.Login)

	auth.POST("/refresh", handler.Refresh)
	auth.POST("/logout", handler.Logout)

}
