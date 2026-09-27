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

	if err != nil || registrationID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid registration id",
		})
		return
	}

	ticketID, err := h.service.CreateTicket(
		c.Request.Context(),
		registrationID,
		userID,
	)

	if err != nil {

		switch {

		case errors.Is(err, apperrors.ErrRegistrationNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error": "registration not found",
			})
			return

		case errors.Is(err, apperrors.ErrForbidden):
			c.JSON(http.StatusForbidden, gin.H{
				"error": "you do not have permission to create this ticket",
			})
			return

		case errors.Is(err, apperrors.ErrInvalidInput):
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "cancelled registration cannot have a ticket",
			})
			return

		case errors.Is(err, apperrors.ErrConflict):
			c.JSON(http.StatusConflict, gin.H{
				"error": "ticket already exists for this registration",
			})
			return

		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "internal server error",
			})
			return
		}
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":   "ticket created successfully",
		"ticket_id": ticketID,
	})
}

// GetMyTickets handles GET /tickets/me.
func (h *Handler) GetMyTickets(c *gin.Context) {

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

	tickets, err := h.service.GetMyTickets(
		c.Request.Context(),
		userID,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to fetch tickets",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"tickets": tickets,
	})
}

// GetTicketByID handles GET /tickets/:id.
func (h *Handler) GetTicketByID(c *gin.Context) {

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

	ticketID, err := strconv.ParseInt(
		c.Param("id"),
		10,
		64,
	)

	if err != nil || ticketID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid ticket id",
		})
		return
	}

	ticket, err := h.service.GetTicketByID(
		c.Request.Context(),
		ticketID,
		userID,
	)

	if err != nil {

		switch {

		case errors.Is(err, apperrors.ErrTicketNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error": "ticket not found",
			})
			return

		case errors.Is(err, apperrors.ErrForbidden):
			c.JSON(http.StatusForbidden, gin.H{
				"error": "you do not have permission to view this ticket",
			})
			return

		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "failed to fetch ticket",
			})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"ticket": ticket,
	})
}