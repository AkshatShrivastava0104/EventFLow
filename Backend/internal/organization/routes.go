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

	// Organization creation is handled only after a paid plan checkout.
	organizations.POST("", handler.CreateOrganization)

	organizations.GET("", handler.GetOrganizations)

	organizations.GET("/:id", handler.GetOrganizationByID)

	// Organization ADMIN authorization is handled inside the service layer.
	organizations.PATCH("/:id", handler.UpdateOrganization)

	organizations.POST("/:id/members", handler.AddMember)

	organizations.GET("/:id/members", handler.GetMembers)

	organizations.PATCH(
		"/:id/members/:userId",
		handler.UpdateMemberRole,
	)

	organizations.DELETE(
		"/:id/members/:userId",
		handler.RemoveMember,
	)

	organizations.DELETE(
		"/:id",
		handler.DeleteOrganization,
	)
}