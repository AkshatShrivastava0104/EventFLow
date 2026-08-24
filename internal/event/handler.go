package event

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

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

func (h *Handler) CreateEvent(c *gin.Context) {

	// 1. Get user ID from JWT
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

	// 2. Get organization ID from URL
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

	// 3. Read request body
	var req CreateEventRequest

	if errors.Is(err, apperrors.ErrInvalidInput) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid event data",
		})
		return
	}

	// 4. Create event
	eventID, err := h.service.CreateEvent(
		c.Request.Context(),
		organizationID,
		userID,
		req,
	)

	if err != nil {

		if errors.Is(err, apperrors.ErrForbidden) {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "you do not have permission to create events",
			})
			return
		}


		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":  "event created successfully",
		"event_id": eventID,
	})
}




func (h *Handler) GetEvents(c *gin.Context) {

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

	page := 1
	limit := 20

	if value := c.Query("page"); value != "" {
		page, err = strconv.Atoi(value)

		if err != nil || page < 1 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "invalid page",
			})
			return
		}
	}

	if value := c.Query("limit"); value != "" {
		limit, err = strconv.Atoi(value)

		if err != nil || limit < 1 || limit > 100 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "limit must be between 1 and 100",
			})
			return
		}
	}

	result, err := h.service.GetEvents(
		c.Request.Context(),
		organizationID,
		userID,
		page,
		limit,
	)

	if err != nil {

		if errors.Is(err, apperrors.ErrForbidden) {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "you do not have permission to view this organization",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "internal server error",
		})
		return
	}

	c.JSON(http.StatusOK, result)
}



func (h *Handler) GetEventByID(c *gin.Context) {

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

	eventID, err := strconv.ParseInt(
		c.Param("id"),
		10,
		64,
	)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid event id",
		})
		return
	}

	event, err := h.service.GetEventByID(
		c.Request.Context(),
		eventID,
		userID,
	)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, event)
}


func (h *Handler) UpdateEvent(c *gin.Context) {

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

	eventID, err := strconv.ParseInt(
		c.Param("id"),
		10,
		64,
	)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid event id",
		})
		return
	}

	var req UpdateEventRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid request body",
		})
		return
	}

	err = h.service.UpdateEvent(
		c.Request.Context(),
		eventID,
		userID,
		req,
	)

	if err != nil {

		if strings.Contains(
			err.Error(),
			"permission",
		) {
			c.JSON(http.StatusForbidden, gin.H{
				"error": err.Error(),
			})
			return
		}

		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "event updated successfully",
	})
}



func (h *Handler) DeleteEvent(c *gin.Context) {

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

	eventID, err := strconv.ParseInt(
		c.Param("id"),
		10,
		64,
	)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid event id",
		})
		return
	}

	err = h.service.DeleteEvent(
		c.Request.Context(),
		eventID,
		userID,
	)

	if err != nil {

		if strings.Contains(err.Error(), "only owner") {
			c.JSON(http.StatusForbidden, gin.H{
				"error": err.Error(),
			})
			return
		}

		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "event deleted successfully",
	})
}



func (h *Handler) PublishEvent(c *gin.Context) {

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

	eventID, err := strconv.ParseInt(
		c.Param("id"),
		10,
		64,
	)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid event id",
		})
		return
	}

	err = h.service.PublishEvent(
		c.Request.Context(),
		eventID,
		userID,
	)

	if err != nil {

		if errors.Is(err, apperrors.ErrEventNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "event not found",
			})
			return
		}

		if errors.Is(err, apperrors.ErrForbidden) {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "you do not have permission to publish this event",
			})
			return
		}

		if errors.Is(err, apperrors.ErrInvalidInput) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "only draft events can be published",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "internal server error",
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "event published successfully",
	})
}


func (h *Handler) CancelEvent(c *gin.Context) {

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

	eventID, err := strconv.ParseInt(
		c.Param("id"),
		10,
		64,
	)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid event id",
		})
		return
	}

	err = h.service.CancelEvent(
		c.Request.Context(),
		eventID,
		userID,
	)

	if err != nil {

		if errors.Is(err, apperrors.ErrEventNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "event not found",
			})
			return
		}

		if errors.Is(err, apperrors.ErrForbidden) {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "you do not have permission to cancel this event",
			})
			return
		}

		if errors.Is(err, apperrors.ErrInvalidInput) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "this event cannot be cancelled",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "internal server error",
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "event cancelled successfully",
	})
}














func (h *Handler) CompleteEvent(c *gin.Context) {

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

	eventID, err := strconv.ParseInt(
		c.Param("id"),
		10,
		64,
	)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid event id",
		})
		return
	}

	err = h.service.CompleteEvent(
		c.Request.Context(),
		eventID,
		userID,
	)

	if err != nil {

		if errors.Is(err, apperrors.ErrEventNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "event not found",
			})
			return
		}

		if errors.Is(err, apperrors.ErrForbidden) {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "you do not have permission to update this event",
			})
			return
		}

		if errors.Is(err, apperrors.ErrInvalidInput) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "invalid event data or event cannot be updated",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "internal server error",
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "event completed successfully",
	})
}



func (h *Handler) GetAllEvents(c *gin.Context) {

	// ==========================================
	// User authentication
	// ==========================================

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

	_ = userID
	// We intentionally don't filter by organization here.
	// Access to the endpoint itself is protected by JWT.
	// Published events can be listed globally for discovery.
	// Owner/admin specific filtering can be tightened later.

	// ==========================================
	// Pagination
	// ==========================================

	page := 1
	limit := 12

	if value := c.Query("page"); value != "" {
		parsed, err := strconv.Atoi(value)

		if err != nil || parsed < 1 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "invalid page",
			})
			return
		}

		page = parsed
	}

	if value := c.Query("page_size"); value != "" {
		parsed, err := strconv.Atoi(value)

		if err != nil || parsed < 1 || parsed > 100 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "page_size must be between 1 and 100",
			})
			return
		}

		limit = parsed
	} else if value := c.Query("limit"); value != "" {
		// Backward-compatible support.
		parsed, err := strconv.Atoi(value)

		if err != nil || parsed < 1 || parsed > 100 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "limit must be between 1 and 100",
			})
			return
		}

		limit = parsed
	}

	// ==========================================
	// Filters
	// ==========================================

	status := strings.TrimSpace(
		strings.ToLower(
			c.Query("status"),
		),
	)

	switch status {
	case "":
	case "all":
	case "draft":
	case "published":
	case "cancelled":
	case "completed":
	default:
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid status",
		})
		return
	}

	order := strings.TrimSpace(
		strings.ToLower(
			c.Query("order"),
		),
	)

	if order == "" {
		order = "desc"
	}

	if order != "asc" && order != "desc" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "order must be asc or desc",
		})
		return
	}

	// ==========================================
	// Fetch
	// ==========================================

	result, err := h.service.GetAllEvents(
		c.Request.Context(),
		page,
		limit,
		status,
		order,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "internal server error",
		})
		return
	}

	c.JSON(http.StatusOK, result)
}