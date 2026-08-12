package auth

import "github.com/gin-gonic/gin"

func RegisterAuthRoutes(r gin.IRouter, handler *Handler, authMiddleware gin.HandlerFunc) {
	r.POST("/auth/register", handler.Register)
	r.POST("/auth/login", handler.Login)

	authGroup := r.Group("/auth")
	authGroup.Use(authMiddleware)
	{
		authGroup.GET("/me", handler.Me)
	}
}
