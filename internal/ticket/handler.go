package ticket

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

func (h *Handler) CreateTicket(c *gin.Context) {

	// Get logged-in user ID from JWT
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

	// Get registration ID from URL
	registrationID, err := strconv.ParseInt(
		c.Param("id"),
		10,
		64,
	)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid registration id",
		})
		return
	}

	// Create ticket
	ticketID, err := h.service.CreateTicket(
		c.Request.Context(),
		registrationID,
		userID,
	)

	if err != nil {

		if errors.Is(err, apperrors.ErrRegistrationNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "registration not found",
			})
			return
		}

		if errors.Is(err, apperrors.ErrInvalidInput) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "cancelled registration cannot have a ticket",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "internal server error",
		})
		return
		
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":  "ticket created successfully",
		"ticket_id": ticketID,
	})
}