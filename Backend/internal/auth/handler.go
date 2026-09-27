package auth

import (
	"errors"
	"net/http"

	apperrors "github.com/AkshatShrivastava0104/EventFlow/internal/errors"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// Register godoc
// @Summary Register a new user
// @Description Creates a new EventFlow user account
// @Tags Authentication
// @Accept json
// @Produce json
// @Param request body RegisterRequest true "Registration request"
// @Success 201 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 409 {object} map[string]interface{}
// @Router /api/v1/auth/register [post]
func (h *Handler) Register(c *gin.Context) {
	var dto RegisterRequest

	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	resp, err := h.service.Register(dto)
	if err != nil {
		if errors.Is(err, apperrors.ErrConflict) {
			c.JSON(http.StatusConflict, gin.H{
				"error": "email already registered",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, resp)
}

// Login godoc
// @Summary Login user
// @Description Authenticates a user and returns access/refresh tokens
// @Tags Authentication
// @Accept json
// @Produce json
// @Param request body LoginRequest true "Login request"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Router /api/v1/auth/login [post]
func (h *Handler) Login(c *gin.Context) {
	var dto LoginRequest

	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	resp, err := h.service.Login(dto)
	if err != nil {
		if errors.Is(err, apperrors.ErrUnauthorized) {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "invalid credentials",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *Handler) Me(c *gin.Context) {
	userID, exists := c.Get("user_id")

	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "unauthorized",
		})
		return
	}

	id, ok := userID.(int64)

	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "invalid user id",
		})
		return
	}

	profile, err := h.service.GetUserProfile(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, profile)
}

// UpdateProfile updates the signed-in user's name and email.
func (h *Handler) UpdateProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")

	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "unauthorized",
		})
		return
	}

	id, ok := userID.(int64)

	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "invalid user id",
		})
		return
	}

	var dto UpdateProfileRequest

	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	profile, err := h.service.UpdateProfile(id, dto)
	if err != nil {
		if errors.Is(err, apperrors.ErrConflict) {
			c.JSON(http.StatusConflict, gin.H{
				"error": "email already in use",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, profile)
}

// ChangePassword updates the signed-in user's password after verifying
// the current one.
func (h *Handler) ChangePassword(c *gin.Context) {
	userID, exists := c.Get("user_id")

	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "unauthorized",
		})
		return
	}

	id, ok := userID.(int64)

	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "invalid user id",
		})
		return
	}

	var dto ChangePasswordRequest

	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	if err := h.service.ChangePassword(id, dto); err != nil {
		if errors.Is(err, apperrors.ErrUnauthorized) {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "current password is incorrect",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "password updated successfully",
	})
}

// Refresh godoc
// @Summary Refresh access token
// @Description Generates a new access token using a valid refresh token.
// @Tags Authentication
// @Accept json
// @Produce json
// @Param request body map[string]interface{} true "Refresh token"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/auth/refresh [post]
func (h *Handler) Refresh(c *gin.Context) {
	var body struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "refresh_token is required",
		})
		return
	}

	response, err := h.service.RefreshAccessToken(
		c.Request.Context(),
		body.RefreshToken,
	)

	if err != nil {
		if errors.Is(err, apperrors.ErrUnauthorized) {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "invalid or expired refresh token",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "internal server error",
		})
		return
	}

	c.JSON(http.StatusOK, response)
}

// Logout godoc
// @Summary Logout user
// @Description Invalidates the current refresh session.
// @Tags Authentication
// @Security BearerAuth
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/auth/logout [post]
func (h *Handler) Logout(c *gin.Context) {
	var body struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "refresh_token is required",
		})
		return
	}

	err := h.service.Logout(
		c.Request.Context(),
		body.RefreshToken,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to logout",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "logged out successfully",
	})
}