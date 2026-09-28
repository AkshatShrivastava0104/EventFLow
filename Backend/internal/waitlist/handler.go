package waitlist

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

// JoinWaitlist adds the authenticated user to an event waitlist.
func (h *Handler) JoinWaitlist(c *gin.Context) {
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

	eventID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || eventID < 1 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid event id",
		})
		return
	}

	waitlistID, err := h.service.JoinWaitlist(
		c.Request.Context(),
		eventID,
		userID,
	)

	if err != nil {
		switch {
		case errors.Is(err, apperrors.ErrEventNotFound):
			c.JSON(http.StatusNotFound, gin.H{
				"error": "event not found",
			})

		case errors.Is(err, apperrors.ErrEventNotPublished):
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "only published events can have a waitlist",
			})

		case errors.Is(err, apperrors.ErrAlreadyWaitlisted):
			c.JSON(http.StatusConflict, gin.H{
				"error": "user is already on the waitlist",
			})

		case errors.Is(err, apperrors.ErrConflict):
			c.JSON(http.StatusConflict, gin.H{
				"error": "user is already registered or already on the waitlist",
			})

		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "internal server error",
			})
		}

		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":     "added to waitlist successfully",
		"waitlist_id": waitlistID,
	})
}

// ListOwnerWaitlist returns the platform-wide waitlist for the owner
// console.
//
// Authentication and platform-owner authorization are applied by the
// admin/owner route middleware.
func (h *Handler) ListOwnerWaitlist(c *gin.Context) {
	search := strings.TrimSpace(c.Query("search"))

	eventID, err := parsePositiveInt64Query(c.Query("event_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid event_id",
		})
		return
	}

	organizationID, err := parsePositiveInt64Query(
		c.Query("organization_id"),
	)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid organization_id",
		})
		return
	}

	sort := strings.TrimSpace(c.Query("sort"))

	switch sort {
	case "",
		"position_asc",
		"position_desc",
		"newest",
		"oldest",
		"attendee_asc",
		"attendee_desc",
		"event_asc",
		"event_desc":
	default:
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid sort",
		})
		return
	}

	page, err := parsePositiveQuery(c.Query("page"), 1)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid page",
		})
		return
	}

	limit, err := parsePositiveQuery(c.Query("limit"), 20)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid limit",
		})
		return
	}

	if limit > 100 {
		limit = 100
	}

	items, total, err := h.service.ListOwnerWaitlist(
		c.Request.Context(),
		search,
		eventID,
		organizationID,
		sort,
		page,
		limit,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to fetch waitlist",
		})
		return
	}

	totalPages := 0
	if total > 0 {
		totalPages = (total + limit - 1) / limit
	}

	c.JSON(http.StatusOK, gin.H{
		"waitlist": items,
		"pagination": gin.H{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": totalPages,
		},
	})
}

// PromoteNextUser promotes the first person in the queue for an event.
func (h *Handler) PromoteNextUser(c *gin.Context) {
	eventID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || eventID < 1 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid event id",
		})
		return
	}

	err = h.service.PromoteNextUser(
		c.Request.Context(),
		eventID,
	)

	if err != nil {
		if errors.Is(err, apperrors.ErrEventNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "event not found",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to promote waitlisted attendee",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "waitlist promotion completed",
	})
}

// PromoteUser promotes a specific waitlist entry.
//
// The service/repository ensures that the selected attendee is the first
// eligible person in the queue.
func (h *Handler) PromoteUser(c *gin.Context) {
	waitlistID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || waitlistID < 1 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid waitlist id",
		})
		return
	}

	err = h.service.PromoteUser(
		c.Request.Context(),
		waitlistID,
	)

	if err != nil {
		status := http.StatusInternalServerError

		if strings.Contains(
			strings.ToLower(err.Error()),
			"not found",
		) {
			status = http.StatusNotFound
		}

		if strings.Contains(
			strings.ToLower(err.Error()),
			"only the first",
		) ||
			strings.Contains(
				strings.ToLower(err.Error()),
				"still full",
			) {
			status = http.StatusConflict
		}

		c.JSON(status, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "waitlisted attendee promoted successfully",
	})
}

// RemoveFromWaitlist removes a specific waitlist entry.
func (h *Handler) RemoveFromWaitlist(c *gin.Context) {
	waitlistID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || waitlistID < 1 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid waitlist id",
		})
		return
	}

	err = h.service.RemoveFromWaitlist(
		c.Request.Context(),
		waitlistID,
	)

	if err != nil {
		if strings.Contains(
			strings.ToLower(err.Error()),
			"not found",
		) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "waitlist entry not found",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to remove waitlist entry",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "removed from waitlist successfully",
	})
}

func parsePositiveInt64Query(value string) (int64, error) {
	value = strings.TrimSpace(value)

	if value == "" {
		return 0, nil
	}

	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil || parsed < 1 {
		return 0, errors.New("invalid positive integer")
	}

	return parsed, nil
}

func parsePositiveQuery(value string, defaultValue int) (int, error) {
	value = strings.TrimSpace(value)

	if value == "" {
		return defaultValue, nil
	}

	parsed, err := strconv.Atoi(value)
	if err != nil || parsed < 1 {
		return 0, errors.New("invalid positive integer")
	}

	return parsed, nil
}