package checkin

import (
	"errors"
	"net/http"
	"strconv"

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

type CheckInRequest struct {
	TicketNumber string `json:"ticket_number" binding:"required"`
}

func (h *Handler) CheckIn(c *gin.Context) {

	// Get logged-in user from JWT
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

	// Get event ID from URL
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

	// Parse body
	var req CheckInRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid request body",
		})
		return
	}

	// Perform check-in
	checkinID, err := h.service.CheckIn(
		c.Request.Context(),
		eventID,
		req.TicketNumber,
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
				"error": "you do not have permission to check in attendees",
			})
			return
		}

		if errors.Is(err, apperrors.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "valid ticket not found for this event",
			})
			return
		}

		if errors.Is(err, apperrors.ErrConflict) {
			c.JSON(http.StatusConflict, gin.H{
				"error": "ticket already checked in",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "internal server error",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":   "check-in successful",
		"checkin_id": checkinID,
	})
}