package router

import "github.com/gin-gonic/gin"

func SetupRouter() *gin.Engine {
	// r := gin.Default()

	r := gin.New()
	r.Use(gin.Logger())
	r.Use(gin.Recovery())

	r.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "Welcome to EventFlow API!"})
	})

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "healthy"})
	})
	return r
} 
