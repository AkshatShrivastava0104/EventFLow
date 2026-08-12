package organization

import (
	"net/http"
	"strconv"

	"github.com/AkshatShrivastava0104/EventFlow/internal/auth"

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
		req,
		userID,
	)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
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