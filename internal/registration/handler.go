package registration

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

	// Register / automatically waitlist
	result, err := h.service.Register(
		c.Request.Context(),
		eventID,
		userID,
	)

	// IMPORTANT:
	// Always handle error before accessing result.
	if err != nil {

		switch {

		case errors.Is(err, apperrors.ErrEventNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error": "event not found",
			})
			return

		case errors.Is(err, apperrors.ErrAlreadyRegistered):
			c.JSON(http.StatusConflict, gin.H{
				"error": "user already registered",
			})
			return

		case errors.Is(err, apperrors.ErrAlreadyWaitlisted):
			c.JSON(http.StatusConflict, gin.H{
				"error": "user already on waitlist",
			})
			return

		case errors.Is(err, apperrors.ErrRegistrationDeadlinePassed):
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "registration deadline has passed",
			})
			return

		case errors.Is(err, apperrors.ErrEventNotPublished):
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "registrations are only allowed for published events",
			})
			return

		case errors.Is(err, apperrors.ErrConflict):
			c.JSON(http.StatusConflict, gin.H{
				"error": "registration conflict",
			})
			return

		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": err.Error(),
			})
			return
		}
	}

	// Defensive check.
	if result == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "registration result is nil",
		})
		return
	}

	// User was waitlisted.
	if result.Status == "waitlisted" {

		if result.WaitlistID == nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "waitlist result is invalid",
			})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"message":     "event is full, added to waitlist",
			"waitlist_id": *result.WaitlistID,
		})
		return
	}

	// User was registered.
	if result.Status == "registered" {

		if result.RegistrationID == nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "registration result is invalid",
			})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"message":         "registration created successfully",
			"registration_id": *result.RegistrationID,
		})
		return
	}

	c.JSON(http.StatusInternalServerError, gin.H{
		"error": "unknown registration result",
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

	page := 1
	limit := 20

	var err error

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

	result, err := h.service.GetMyRegistrations(
		c.Request.Context(),
		userID,
		page,
		limit,
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
				"error": "you do not have permission to view attendees",
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
		if errors.Is(err, apperrors.ErrRegistrationNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "registration not found or already cancelled",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "internal server error",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "registration cancelled successfully",
	})
}




func (h *Handler) GetEventRegistrations(c *gin.Context) {

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

	result, err := h.service.GetEventRegistrations(
		c.Request.Context(),
		eventID,
		userID,
		page,
		limit,
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
				"error": "you do not have permission to view attendees",
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