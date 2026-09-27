package admin

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