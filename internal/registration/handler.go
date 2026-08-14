package registration

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

func (h *Handler) Register(c *gin.Context) {

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

	// Register user
	registrationID, err := h.service.Register(
		c.Request.Context(),
		eventID,
		userID,
	)

	if err != nil {

		switch err.Error() {

		case "you are not a member of this organization":
			c.JSON(http.StatusForbidden, gin.H{
				"error": err.Error(),
			})
			return

		case "event not found":
			c.JSON(http.StatusNotFound, gin.H{
				"error": err.Error(),
			})
			return

		case "user already registered":
			c.JSON(http.StatusConflict, gin.H{
				"error": err.Error(),
			})
			return

		case "event is full":
			c.JSON(http.StatusConflict, gin.H{
				"error": err.Error(),
			})
			return

		case "registrations are only allowed for published events":
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
		"message":         "registration created successfully",
		"registration_id": registrationID,
	})
}



func (h *Handler) GetMyRegistrations(c *gin.Context) {

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

	registrations, err := h.service.GetMyRegistrations(
		c.Request.Context(),
		userID,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"registrations": registrations,
	})
}


func (h *Handler) CancelRegistration(c *gin.Context) {

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

	err = h.service.CancelRegistration(
		c.Request.Context(),
		registrationID,
		userID,
	)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "registration cancelled successfully",
	})
}