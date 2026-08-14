package waitlist

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

func (h *Handler) JoinWaitlist(c *gin.Context) {

	// Get user from JWT
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

	// Get event ID
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

	// Join waitlist
	waitlistID, err := h.service.JoinWaitlist(
		c.Request.Context(),
		eventID,
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

		case "only published events can have a waitlist":
			c.JSON(http.StatusBadRequest, gin.H{
				"error": err.Error(),
			})
			return

		case "user is already registered for this event":
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
		"message":    "added to waitlist successfully",
		"waitlist_id": waitlistID,
	})
}