package ticket

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

		switch err.Error() {

		case "registration not found":
			c.JSON(http.StatusNotFound, gin.H{
				"error": err.Error(),
			})
			return

		case "cancelled registration cannot have a ticket":
			c.JSON(http.StatusBadRequest, gin.H{
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
		"message":  "ticket created successfully",
		"ticket_id": ticketID,
	})
}