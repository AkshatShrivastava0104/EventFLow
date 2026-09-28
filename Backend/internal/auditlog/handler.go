package auditlog

import (
	"net/http"
	"strconv"
	"strings"

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

// ListAuditLogs handles GET /api/v1/audit-logs.
//
// Query parameters:
//   - search
//   - action
//   - entity
//   - page
//   - limit
func (h *Handler) ListAuditLogs(c *gin.Context) {
	search := strings.TrimSpace(c.Query("search"))
	action := strings.TrimSpace(c.Query("action"))
	entity := strings.TrimSpace(c.Query("entity"))

	page := parsePositiveInt(
		c.Query("page"),
		1,
	)

	limit := parsePositiveInt(
		c.Query("limit"),
		25,
	)

	if limit > 100 {
		limit = 100
	}

	result, err := h.service.ListAuditLogs(
		c.Request.Context(),
		search,
		action,
		entity,
		page,
		limit,
	)
	if err != nil {
		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"error": "failed to fetch audit logs",
			},
		)
		return
	}

	c.JSON(
		http.StatusOK,
		result,
	)
}

// GetAuditLog handles GET /api/v1/audit-logs/:id.
func (h *Handler) GetAuditLog(c *gin.Context) {
	id, ok := parseAuditLogID(c)
	if !ok {
		return
	}

	log, err := h.service.GetAuditLogByID(
		c.Request.Context(),
		id,
	)
	if err != nil {
		c.JSON(
			http.StatusNotFound,
			gin.H{
				"error": "audit log not found",
			},
		)
		return
	}

	c.JSON(
		http.StatusOK,
		log,
	)
}

func parsePositiveInt(
	value string,
	defaultValue int,
) int {
	value = strings.TrimSpace(value)

	if value == "" {
		return defaultValue
	}

	parsed, err := strconv.Atoi(value)

	if err != nil || parsed < 1 {
		return defaultValue
	}

	return parsed
}