package organization

import (
	"github.com/gin-gonic/gin"
) 

func RegisterOrganizationRoutes(
	api *gin.RouterGroup,
	handler *Handler,
	authMiddleware gin.HandlerFunc,
) {
	organizations := api.Group("/organizations")

	organizations.Use(authMiddleware)

	organizations.POST("", handler.CreateOrganization)
	organizations.GET("", handler.GetOrganizations)
	organizations.GET("/:id", handler.GetOrganizationByID)
}