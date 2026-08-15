package checkin

import (
	"net/http"
	"strconv"

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

		switch err.Error() {

		case "event not found":
			c.JSON(http.StatusNotFound, gin.H{
				"error": err.Error(),
			})
			return

		case "you are not a member of this organization":
			c.JSON(http.StatusForbidden, gin.H{
				"error": err.Error(),
			})
			return

		case "you do not have permission to check in attendees":
			c.JSON(http.StatusForbidden, gin.H{
				"error": err.Error(),
			})
			return

		case "valid ticket not found for this event":
			c.JSON(http.StatusNotFound, gin.H{
				"error": err.Error(),
			})
			return

		case "ticket already checked in":
			c.JSON(http.StatusConflict, gin.H{
				"error": err.Error(),
			})
			return

		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": err.Error(),
			})
			return
		}
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":   "check-in successful",
		"checkin_id": checkinID,
	})
}