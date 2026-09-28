package systemhealth

import (
	"net/http"
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

func (h *Handler) GetHealth(c *gin.Context) {
	role := strings.TrimSpace(
		strings.ToLower(
			c.GetString("role"),
		),
	)

	if role != "platform_owner" && role != "owner" {
		c.JSON(
			http.StatusForbidden,
			gin.H{
				"error": "platform owner access required",
			},
		)
		return
	}

	health := h.service.GetHealth(
		c.Request.Context(),
	)

	statusCode := http.StatusOK

	if health.Status == "unhealthy" {
		statusCode = http.StatusServiceUnavailable
	}

	c.JSON(
		statusCode,
		HealthResponse{
			Health: *health,
		},
	)
}