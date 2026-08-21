package waitlist

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

		if errors.Is(err, apperrors.ErrEventNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "event not found",
			})
			return
		}

		if errors.Is(err, apperrors.ErrEventNotPublished) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "only published events can have a waitlist",
			})
			return
		}

		if errors.Is(err, apperrors.ErrConflict) {
			c.JSON(http.StatusConflict, gin.H{
				"error": "user is already registered or already on the waitlist",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "internal server error",
		})
return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":    "added to waitlist successfully",
		"waitlist_id": waitlistID,
	})
}