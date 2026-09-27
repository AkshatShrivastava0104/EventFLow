package event

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"net/http"
	"os"
	"path/filepath"
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

/* =========================================================
   Create Event
========================================================= */

func (h *Handler) CreateEvent(c *gin.Context) {
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

	organizationID, err := strconv.ParseInt(
		c.Param("id"),
		10,
		64,
	)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid organization id",
		})
		return
	}

	var req CreateEventRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid event data",
		})
		return
	}

	eventID, err := h.service.CreateEvent(
		c.Request.Context(),
		organizationID,
		userID,
		req,
	)

	if err != nil {
		if errors.Is(err, apperrors.ErrForbidden) {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "you do not have permission to create events",
			})
			return
		}

		if errors.Is(err, apperrors.ErrInvalidInput) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "invalid event data",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "internal server error",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":  "event created successfully",
		"event_id": eventID,
	})
}

/* =========================================================
   Get Organization Events
========================================================= */

func (h *Handler) GetEvents(c *gin.Context) {
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

	organizationID, err := strconv.ParseInt(
		c.Param("id"),
		10,
		64,
	)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid organization id",
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

	result, err := h.service.GetEvents(
		c.Request.Context(),
		organizationID,
		userID,
		page,
		limit,
	)

	if err != nil {
		if errors.Is(err, apperrors.ErrForbidden) {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "you do not have permission to view this organization",
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

/* =========================================================
   Get Event By ID
========================================================= */

func (h *Handler) GetEventByID(c *gin.Context) {
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

	event, err := h.service.GetEventByID(
		c.Request.Context(),
		eventID,
		userID,
	)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, event)
}

/* =========================================================
   Update Event
========================================================= */

func (h *Handler) UpdateEvent(c *gin.Context) {
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

	var req UpdateEventRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid request body",
		})
		return
	}

	err = h.service.UpdateEvent(
		c.Request.Context(),
		eventID,
		userID,
		req,
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
				"error": "you do not have permission to update this event",
			})
			return
		}

		if errors.Is(err, apperrors.ErrInvalidInput) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "invalid event data",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "internal server error",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "event updated successfully",
	})
}

/* =========================================================
   Upload Event Media
========================================================= */

// POST /api/v1/events/:id/media
//
// Development storage:
//   uploads/events/<generated-name>
//
// Supported:
//   Images: jpg, jpeg, png, webp, gif
//   Videos: mp4, webm, mov
func (h *Handler) UploadEventMedia(c *gin.Context) {
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

	/*
	 * Limit request body size.
	 *
	 * Current development limit:
	 * 100 MB.
	 *
	 * This can be changed later for production storage.
	 */
	const maxUploadSize = 100 << 20

	c.Request.Body = http.MaxBytesReader(
		c.Writer,
		c.Request.Body,
		maxUploadSize,
	)

	fileHeader, err := c.FormFile("file")

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "file is required",
		})
		return
	}

	if fileHeader.Size <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "empty files are not allowed",
		})
		return
	}

	if fileHeader.Size > maxUploadSize {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{
			"error": "file size cannot exceed 100 MB",
		})
		return
	}

	originalName := filepath.Base(
		fileHeader.Filename,
	)

	extension := strings.ToLower(
		filepath.Ext(originalName),
	)

	allowedImages := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".webp": true,
		".gif":  true,
	}

	allowedVideos := map[string]bool{
		".mp4":  true,
		".webm": true,
		".mov":  true,
	}

	mediaType := ""

	switch {
	case allowedImages[extension]:
		mediaType = "image"

	case allowedVideos[extension]:
		mediaType = "video"

	default:
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "unsupported file type. Allowed: JPG, JPEG, PNG, WEBP, GIF, MP4, WEBM, MOV",
		})
		return
	}

	/*
	 * Generate a random filename so users cannot overwrite
	 * another event's uploaded file.
	 */
	randomBytes := make([]byte, 16)

	if _, err := rand.Read(randomBytes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to generate file name",
		})
		return
	}

	fileName := hex.EncodeToString(randomBytes) + extension

	uploadDir := filepath.Join(
		"uploads",
		"events",
	)

	if err := os.MkdirAll(
		uploadDir,
		0755,
	); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to create upload directory",
		})
		return
	}

	filePath := filepath.Join(
		uploadDir,
		fileName,
	)

	if err := c.SaveUploadedFile(
		fileHeader,
		filePath,
	); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to save uploaded file",
		})
		return
	}

	/*
	 * URL stored in the events.cover_image column.
	 */
	fileURL := "/uploads/events/" + fileName

	/*
	 * Persist the uploaded media against the event.
	 *
	 * This also performs the organization-level ADMIN check.
	 */
	if err := h.service.UploadEventMedia(
		c.Request.Context(),
		eventID,
		userID,
		fileURL,
	); err != nil {
		// Avoid leaving orphan files when DB persistence fails.
		_ = os.Remove(filePath)

		if errors.Is(err, apperrors.ErrEventNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "event not found",
			})
			return
		}

		if errors.Is(err, apperrors.ErrForbidden) {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "you do not have permission to upload media for this event",
			})
			return
		}

		if errors.Is(err, apperrors.ErrInvalidInput) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "invalid media upload",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to save media information",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":       "media uploaded successfully",
		"url":            fileURL,
		"media_url":     fileURL,
		"media_type":    mediaType,
		"file_name":     fileName,
		"original_name": originalName,
		"size":          fileHeader.Size,
	})
}

/* =========================================================
   Delete Event
========================================================= */

func (h *Handler) DeleteEvent(c *gin.Context) {
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

	err = h.service.DeleteEvent(
		c.Request.Context(),
		eventID,
		userID,
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
				"error": "you do not have permission to delete this event",
			})
			return
		}

		if errors.Is(err, apperrors.ErrInvalidInput) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "this event cannot be deleted",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "internal server error",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "event deleted successfully",
	})
}

/* =========================================================
   Publish Event
========================================================= */

func (h *Handler) PublishEvent(c *gin.Context) {
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

	err = h.service.PublishEvent(
		c.Request.Context(),
		eventID,
		userID,
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
				"error": "you do not have permission to publish this event",
			})
			return
		}

		if errors.Is(err, apperrors.ErrInvalidInput) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "only draft events can be published",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "internal server error",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "event published successfully",
	})
}

/* =========================================================
   Cancel Event
========================================================= */

func (h *Handler) CancelEvent(c *gin.Context) {
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

	err = h.service.CancelEvent(
		c.Request.Context(),
		eventID,
		userID,
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
				"error": "you do not have permission to cancel this event",
			})
			return
		}

		if errors.Is(err, apperrors.ErrInvalidInput) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "this event cannot be cancelled",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "internal server error",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "event cancelled successfully",
	})
}

/* =========================================================
   Complete Event
========================================================= */

func (h *Handler) CompleteEvent(c *gin.Context) {
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

	err = h.service.CompleteEvent(
		c.Request.Context(),
		eventID,
		userID,
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
				"error": "you do not have permission to complete this event",
			})
			return
		}

		if errors.Is(err, apperrors.ErrInvalidInput) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "only published events can be completed",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "internal server error",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "event completed successfully",
	})
}

/* =========================================================
   Get All Events
========================================================= */

func (h *Handler) GetAllEvents(c *gin.Context) {
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

	_ = userID

	page := 1
	limit := 12

	if value := c.Query("page"); value != "" {
		parsed, err := strconv.Atoi(value)

		if err != nil || parsed < 1 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "invalid page",
			})
			return
		}

		page = parsed
	}

	if value := c.Query("page_size"); value != "" {
		parsed, err := strconv.Atoi(value)

		if err != nil || parsed < 1 || parsed > 100 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "page_size must be between 1 and 100",
			})
			return
		}

		limit = parsed
	} else if value := c.Query("limit"); value != "" {
		parsed, err := strconv.Atoi(value)

		if err != nil || parsed < 1 || parsed > 100 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "limit must be between 1 and 100",
			})
			return
		}

		limit = parsed
	}

	status := strings.TrimSpace(
		strings.ToLower(
			c.Query("status"),
		),
	)

	switch status {
	case "":
	case "all":
	case "draft":
	case "published":
	case "cancelled":
	case "completed":
	default:
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid status",
		})
		return
	}

	order := strings.TrimSpace(
		strings.ToLower(
			c.Query("order"),
		),
	)

	if order == "" {
		order = "desc"
	}

	if order != "asc" && order != "desc" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "order must be asc or desc",
		})
		return
	}

	search := strings.TrimSpace(c.Query("q"))
	category := strings.TrimSpace(c.Query("category"))
	city := strings.TrimSpace(c.Query("city"))
	price := strings.TrimSpace(strings.ToLower(c.Query("price")))
	sort := strings.TrimSpace(strings.ToLower(c.Query("sort")))

	if price != "" && price != "any" && price != "free" && price != "paid" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "price must be any, free, or paid",
		})
		return
	}

	if sort != "" && sort != "soonest" && sort != "price-asc" && sort != "price-desc" && sort != "popular" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid sort",
		})
		return
	}

	result, err := h.service.GetAllEvents(
		c.Request.Context(),
		page,
		limit,
		status,
		order,
		search,
		category,
		city,
		price,
		sort,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "internal server error",
		})
		return
	}

	c.JSON(http.StatusOK, result)
}