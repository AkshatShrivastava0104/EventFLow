package stats

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

// GET /stats/platform
func (h *Handler) GetPlatformStats(c *gin.Context) {
	userIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "user not authenticated",
		})
		return
	}

	userID, ok := userIDValue.(int64)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "invalid user identity",
		})
		return
	}

	platformRole := ""

	if value, exists := c.Get("role"); exists {
		if role, ok := value.(string); ok {
			platformRole = role
		}
	}

	stats, err := h.service.GetPlatformStats(
		c.Request.Context(),
		userID,
		platformRole,
	)

	if err != nil {
		if err == ErrForbidden {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "forbidden",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to load platform statistics",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"stats": stats,
	})
}

// GET /organizations/:id/stats
//
// Supported query parameter:
//
//	?range=7d
//	?range=30d
//	?range=90d
//	?range=12m
//
// Default: 30d
func (h *Handler) GetOrganizationStats(c *gin.Context) {
	userIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "user not authenticated",
		})
		return
	}

	userID, ok := userIDValue.(int64)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "invalid user identity",
		})
		return
	}

	organizationID, err := strconv.ParseInt(
		c.Param("id"),
		10,
		64,
	)

	if err != nil || organizationID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid organization id",
		})
		return
	}

	// Read the requested analytics period.
	//
	// Empty range is intentionally allowed because the service
	// applies the default 30d range.
	analyticsRange := c.DefaultQuery(
		"range",
		string(Range30Days),
	)

	stats, err := h.service.GetOrganizationStats(
		c.Request.Context(),
		organizationID,
		userID,
		analyticsRange,
	)

	if err != nil {
		if err == ErrOrganizationID {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "organization id is required",
			})
			return
		}

		if err == ErrInvalidRange {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "invalid analytics range",
				"allowed": []string{
					string(Range7Days),
					string(Range30Days),
					string(Range90Days),
					string(Range12Months),
				},
			})
			return
		}

		if err == ErrForbidden {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "forbidden",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to load organization statistics",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"stats": stats,
		"range": analyticsRange,
	})
}

// GET /organizations/:id/operations/stats
func (h *Handler) GetStaffStats(c *gin.Context) {
	userIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "user not authenticated",
		})
		return
	}

	userID, ok := userIDValue.(int64)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "invalid user identity",
		})
		return
	}

	organizationID, err := strconv.ParseInt(
		c.Param("id"),
		10,
		64,
	)

	if err != nil || organizationID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid organization id",
		})
		return
	}

	stats, err := h.service.GetStaffStats(
		c.Request.Context(),
		organizationID,
		userID,
	)

	if err != nil {
		if err == ErrOrganizationID {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "organization id is required",
			})
			return
		}

		if err == ErrForbidden {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "forbidden",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to load staff statistics",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"stats": stats,
	})
}