package payment

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) CreateIntent(c *gin.Context) {
	userID, ok := authenticatedUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	var request CreateIntentRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}
	intent, err := h.service.CreateIntent(c.Request.Context(), userID, request)
	if err != nil {
		h.respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, intent)
}

func (h *Handler) Confirm(c *gin.Context) {
	userID, ok := authenticatedUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}
	var request struct {
		TestCardLastFour string `json:"test_card_last_four"`
	}
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}
	result, err := h.service.Confirm(
		c.Request.Context(),
		userID,
		c.Param("order_id"),
		request.TestCardLastFour,
	)
	if err != nil {
		h.respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) ListOrganizationPayments(c *gin.Context) {
	userID, ok := authenticatedUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}
	organizationID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || organizationID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid organization id"})
		return
	}
	result, err := h.service.ListOrganizationPayments(
		c.Request.Context(),
		userID,
		organizationID,
	)
	if err != nil {
		h.respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func authenticatedUserID(c *gin.Context) (int64, bool) {
	value, exists := c.Get("user_id")
	if !exists {
		return 0, false
	}
	userID, ok := value.(int64)
	return userID, ok && userID > 0
}

func (h *Handler) respondError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrInvalidRequest):
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payment request"})
	case errors.Is(err, ErrNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "event or payment not found"})
	case errors.Is(err, ErrForbidden):
		c.JSON(http.StatusForbidden, gin.H{"error": "you do not have permission to view payments"})
	case errors.Is(err, ErrNotEligible):
		c.JSON(http.StatusConflict, gin.H{"error": "an organizer account already exists for this user"})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "payment request failed"})
	}
}
