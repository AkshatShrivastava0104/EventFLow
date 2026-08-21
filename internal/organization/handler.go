package organization

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/AkshatShrivastava0104/EventFlow/internal/auth"
	apperrors "github.com/AkshatShrivastava0104/EventFlow/internal/errors"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{
		service: service,
	}
}

func (h *Handler) CreateOrganization(c *gin.Context) {


	userIDValue, exists := c.Get("user_id")

	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "user not authenticated",
		})
		return
	}


	userID, ok := userIDValue.(int64)

	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "invalid user id",
		})
		return
	}

	var req auth.CreateOrganizationRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid request body",
		})
		return
	}

	organizationID, err := h.service.CreateOrganization(
		c.Request.Context(),
		req.Name,
		req.Description,
		userID,
	)

	if err != nil {
		if errors.Is(err, apperrors.ErrInvalidInput) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "invalid organization data",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "internal server error",
		})
		return
	}


	c.JSON(http.StatusCreated, gin.H{
		"message":         "organization created successfully",
		"organization_id": organizationID,
	})
}



func (h *Handler) GetOrganizations(c *gin.Context) {

	// Get user ID from JWT middleware
	userIDValue, exists := c.Get("user_id")

	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "user not authenticated",
		})
		return
	}

	userID, ok := userIDValue.(int64)

	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "invalid user id",
		})
		return
	}

	// Call service
	organizations, err := h.service.GetOrganizations(
		c.Request.Context(),
		userID,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to fetch organizations",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"organizations": organizations,
	})
}


func (h *Handler) GetOrganizationByID(c *gin.Context) {

	// Get user ID from JWT
	userIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "user not authenticated",
		})
		return
	}

	userID, ok := userIDValue.(int64)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "invalid user id",
		})
		return
	}

	// Get organization ID from URL
	organizationID, err := strconv.ParseInt(
		c.Param("id"),
		10,
		64,
	)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid organization id",
		})
		return
	}

	// Call service
		organization, err := h.service.GetOrganizationByID(
		c.Request.Context(),
		organizationID,
		userID,
	)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "organization not found",
		})
		return
	}

	c.JSON(http.StatusOK, organization)
}





func (h *Handler) UpdateOrganization(c *gin.Context) {

	// Get user ID from JWT
	userIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "user not authenticated",
		})
		return
	}

	userID, ok := userIDValue.(int64)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "invalid user id",
		})
		return
	}

	// Get organization ID from URL
	organizationID, err := strconv.ParseInt(
		c.Param("id"),
		10,
		64,
	)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid organization id",
		})
		return
	}

	// Parse request body
	var req UpdateOrganizationRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid request body",
		})
		return
	}

	// Call service
	err = h.service.UpdateOrganization(
		c.Request.Context(),
		organizationID,
		userID,
		req,
	)

	if err != nil {

		if errors.Is(err, apperrors.ErrForbidden) {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "you do not have permission to update this organization",
			})
			return
		}

		if errors.Is(err, apperrors.ErrInvalidInput) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "invalid organization data",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "internal server error",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "organization updated successfully",
	})
}




func (h *Handler) AddMember(c *gin.Context) {

	userIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "user not authenticated",
		})
		return
	}

	requestingUserID, ok := userIDValue.(int64)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "invalid user id",
		})
		return
	}

	organizationID, err := strconv.ParseInt(
		c.Param("id"),
		10,
		64,
	)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid organization id",
		})
		return
	}

	var req AddMemberRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid request body",
		})
		return
	}

	err = h.service.AddMember(
		c.Request.Context(),
		organizationID,
		requestingUserID,
		req,
	)

	if err != nil {

		if errors.Is(err, apperrors.ErrForbidden) {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "you do not have permission to add members",
			})
			return
		}

		if errors.Is(err, apperrors.ErrInvalidInput) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "invalid member role",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "internal server error",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "member added successfully",
	})
}






func (h *Handler) GetMembers(c *gin.Context) {

	userIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "user not authenticated",
		})
		return
	}

	userID, ok := userIDValue.(int64)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "invalid user id",
		})
		return
	}

	organizationID, err := strconv.ParseInt(
		c.Param("id"),
		10,
		64,
	)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid organization id",
		})
		return
	}

	members, err := h.service.GetMembers(
		c.Request.Context(),
		organizationID,
		userID,
	)

	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"members": members,
	})
}




func (h *Handler) UpdateMemberRole(c *gin.Context) {

	userIDValue, exists := c.Get("user_id")

	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "user not authenticated",
		})
		return
	}

	requestingUserID, ok := userIDValue.(int64)

	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "invalid user id",
		})
		return
	}

	organizationID, err := strconv.ParseInt(
		c.Param("id"),
		10,
		64,
	)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid organization id",
		})
		return
	}

	targetUserID, err := strconv.ParseInt(
		c.Param("userId"),
		10,
		64,
	)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid user id",
		})
		return
	}

	var body struct {
		Role string `json:"role" binding:"required"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid request body",
		})
		return
	}

	err = h.service.UpdateMemberRole(
		c.Request.Context(),
		organizationID,
		requestingUserID,
		targetUserID,
		body.Role,
	)

	if err != nil {

		if errors.Is(err, apperrors.ErrForbidden) {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "you do not have permission to change this member role",
			})
			return
		}

		if errors.Is(err, apperrors.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "target user is not a member of this organization",
			})
			return
		}

		if errors.Is(err, apperrors.ErrInvalidInput) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "invalid role",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "internal server error",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "member role updated successfully",
	})
}


func (h *Handler) RemoveMember(c *gin.Context) {

	userIDValue, exists := c.Get("user_id")

	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "user not authenticated",
		})
		return
	}

	requestingUserID, ok := userIDValue.(int64)

	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "invalid user id",
		})
		return
	}

	organizationID, err := strconv.ParseInt(
		c.Param("id"),
		10,
		64,
	)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid organization id",
		})
		return
	}

	targetUserID, err := strconv.ParseInt(
		c.Param("userId"),
		10,
		64,
	)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid user id",
		})
		return
	}

	err = h.service.RemoveMember(
		c.Request.Context(),
		organizationID,
		requestingUserID,
		targetUserID,
	)

	if err != nil {

		if errors.Is(err, apperrors.ErrForbidden) {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "you do not have permission to remove this member",
			})
			return
		}

		if errors.Is(err, apperrors.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "target user is not a member of this organization",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "internal server error",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "member removed successfully",
	})
}



func (h *Handler) DeleteOrganization(c *gin.Context) {

	userIDValue, exists := c.Get("user_id")

	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "user not authenticated",
		})
		return
	}

	userID, ok := userIDValue.(int64)

	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "invalid user id",
		})
		return
	}

	organizationID, err := strconv.ParseInt(
		c.Param("id"),
		10,
		64,
	)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid organization id",
		})
		return
	}

	err = h.service.DeleteOrganization(
		c.Request.Context(),
		organizationID,
		userID,
	)

	if err != nil {

		if errors.Is(err, apperrors.ErrOrganizationNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "organization not found",
			})
			return
		}

		if errors.Is(err, apperrors.ErrForbidden) {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "only the owner can delete this organization",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "internal server error",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "organization deleted successfully",
	})
}