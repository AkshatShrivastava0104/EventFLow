package notification

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

func getAuthenticatedUserID(c *gin.Context) (int64, bool) {
	userIDValue, exists := c.Get("user_id")

	if !exists {
		c.JSON(
			http.StatusUnauthorized,
			gin.H{
				"error": "user not authenticated",
			},
		)
		return 0, false
	}

	userID, ok := userIDValue.(int64)

	if !ok {
		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"error": "invalid user id",
			},
		)
		return 0, false
	}

	return userID, true
}

func (h *Handler) GetMyNotifications(
	c *gin.Context,
) {
	userID, ok := getAuthenticatedUserID(c)

	if !ok {
		return
	}

	page := 1
	limit := 20

	var err error

	if value := c.Query("page"); value != "" {
		page, err = strconv.Atoi(value)

		if err != nil || page < 1 {
			c.JSON(
				http.StatusBadRequest,
				gin.H{
					"error": "invalid page",
				},
			)
			return
		}
	}

	if value := c.Query("limit"); value != "" {
		limit, err = strconv.Atoi(value)

		if err != nil || limit < 1 || limit > 100 {
			c.JSON(
				http.StatusBadRequest,
				gin.H{
					"error": "limit must be between 1 and 100",
				},
			)
			return
		}
	}

	result, err :=
		h.service.GetUserNotifications(
			c.Request.Context(),
			userID,
			page,
			limit,
		)

	if err != nil {
		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"error": "internal server error",
			},
		)
		return
	}

	c.JSON(
		http.StatusOK,
		result,
	)
}

func (h *Handler) GetUnreadCount(
	c *gin.Context,
) {
	userID, ok := getAuthenticatedUserID(c)

	if !ok {
		return
	}

	count, err :=
		h.service.GetUnreadCount(
			c.Request.Context(),
			userID,
		)

	if err != nil {
		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"error": "internal server error",
			},
		)
		return
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"unread_count": count,
		},
	)
}

func (h *Handler) MarkAllAsRead(
	c *gin.Context,
) {
	userID, ok := getAuthenticatedUserID(c)

	if !ok {
		return
	}

	updated, err :=
		h.service.MarkAllNotificationsAsRead(
			c.Request.Context(),
			userID,
		)

	if err != nil {
		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"error": "internal server error",
			},
		)
		return
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"message": "all notifications marked as read",
			"updated": updated,
		},
	)
}

func (h *Handler) MarkAsRead(
	c *gin.Context,
) {
	userID, ok := getAuthenticatedUserID(c)

	if !ok {
		return
	}

	notificationID, err :=
		strconv.ParseInt(
			strings.TrimSpace(c.Param("id")),
			10,
			64,
		)

	if err != nil || notificationID <= 0 {
		c.JSON(
			http.StatusBadRequest,
			gin.H{
				"error": "invalid notification id",
			},
		)
		return
	}

	err =
		h.service.MarkNotificationAsRead(
			c.Request.Context(),
			notificationID,
			userID,
		)

	if err != nil {
		if err.Error() == "notification not found" {
			c.JSON(
				http.StatusNotFound,
				gin.H{
					"error": "notification not found",
				},
			)
			return
		}

		c.JSON(
			http.StatusInternalServerError,
			gin.H{
				"error": "internal server error",
			},
		)
		return
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"message": "notification marked as read",
		},
	)
}