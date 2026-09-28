package admin

import (
	"net/http"
	"strconv"
	"strings"
	"time"

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

// GetStats handles GET /admin/stats.
func (h *Handler) GetStats(c *gin.Context) {
	stats, err := h.service.GetStats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to compute platform stats",
		})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// ListOrganizations handles GET /admin/organizations.
func (h *Handler) ListOrganizations(c *gin.Context) {
	search := strings.TrimSpace(c.Query("search"))

	page, _ := strconv.Atoi(c.Query("page"))
	limit, _ := strconv.Atoi(c.Query("limit"))

	result, err := h.service.ListOrganizations(
		c.Request.Context(),
		search,
		page,
		limit,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to fetch organizations",
		})
		return
	}

	c.JSON(http.StatusOK, result)
}

// ListUsers handles GET /admin/users.
func (h *Handler) ListUsers(c *gin.Context) {
	search := strings.TrimSpace(c.Query("search"))

	page, _ := strconv.Atoi(c.Query("page"))
	limit, _ := strconv.Atoi(c.Query("limit"))

	result, err := h.service.ListUsers(
		c.Request.Context(),
		search,
		page,
		limit,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to fetch users",
		})
		return
	}

	c.JSON(http.StatusOK, result)
}

// ListRegistrations handles GET /admin/registrations.
//
// Supported query parameters:
//
//	search
//	event_id
//	organization_id
//	status
//	payment_status
//	checkin
//	from
//	to
//	sort
//	page
//	limit
//
// from/to accept RFC3339 timestamps.
func (h *Handler) ListRegistrations(c *gin.Context) {
	search := strings.TrimSpace(c.Query("search"))

	eventID := parseInt64Query(c.Query("event_id"))
	organizationID := parseInt64Query(c.Query("organization_id"))

	registrationStatus := strings.TrimSpace(
		strings.ToLower(c.Query("status")),
	)

	paymentStatus := strings.TrimSpace(
		strings.ToLower(c.Query("payment_status")),
	)

	checkinStatus := strings.TrimSpace(
		strings.ToLower(c.Query("checkin")),
	)

	if checkinStatus != "" &&
		checkinStatus != "checked_in" &&
		checkinStatus != "not_checked_in" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid checkin filter; use checked_in or not_checked_in",
		})
		return
	}

	var from *time.Time
	if raw := strings.TrimSpace(c.Query("from")); raw != "" {
		parsed, err := time.Parse(time.RFC3339, raw)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "invalid from timestamp; use RFC3339 format",
			})
			return
		}

		from = &parsed
	}

	var to *time.Time
	if raw := strings.TrimSpace(c.Query("to")); raw != "" {
		parsed, err := time.Parse(time.RFC3339, raw)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "invalid to timestamp; use RFC3339 format",
			})
			return
		}

		to = &parsed
	}

	if from != nil && to != nil && !from.Before(*to) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "from must be before to",
		})
		return
	}

	sort := strings.TrimSpace(
		strings.ToLower(c.Query("sort")),
	)

	switch sort {
	case "",
		"newest",
		"oldest",
		"attendee_asc",
		"attendee_desc",
		"event_asc",
		"event_desc",
		"checkin_latest":
		// valid
	default:
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid sort option",
		})
		return
	}

	page, _ := strconv.Atoi(c.Query("page"))
	limit, _ := strconv.Atoi(c.Query("limit"))

	result, err := h.service.ListRegistrations(
		c.Request.Context(),
		search,
		eventID,
		organizationID,
		registrationStatus,
		paymentStatus,
		checkinStatus,
		from,
		to,
		sort,
		page,
		limit,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to fetch registrations",
		})
		return
	}

	c.JSON(http.StatusOK, result)
}

func parseInt64Query(value string) int64 {
	value = strings.TrimSpace(value)

	if value == "" {
		return 0
	}

	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil || parsed < 1 {
		return 0
	}

	return parsed
}