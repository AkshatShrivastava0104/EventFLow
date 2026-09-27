package auth

import (
	"net/http"
	"strings"

	"github.com/AkshatShrivastava0104/EventFlow/internal/config"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func NewAuthMiddleware(
	cfg *config.Config,
	repo *Repository,
) gin.HandlerFunc {
	return func(c *gin.Context) {
		authorization := c.GetHeader("Authorization")

		if authorization == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "missing authorization header",
			})
			return
		}

		parts := strings.SplitN(authorization, " ", 2)

		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "invalid authorization header",
			})
			return
		}

		tokenString := strings.TrimSpace(parts[1])

		if tokenString == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "invalid authorization header",
			})
			return
		}

		token, err := jwt.Parse(
			tokenString,
			func(token *jwt.Token) (interface{}, error) {
				if token.Method != jwt.SigningMethodHS256 {
					return nil, jwt.ErrTokenSignatureInvalid
				}

				return []byte(cfg.JWTSecret), nil
			},
		)

		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "invalid token",
			})
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)

		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "invalid token claims",
			})
			return
		}

		// ---------------------------------------------------------
		// Extract user ID
		// ---------------------------------------------------------
		userIDFloat, ok := claims["user_id"].(float64)

		if !ok || userIDFloat <= 0 {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "invalid user id",
			})
			return
		}

		userID := int64(userIDFloat)

		// ---------------------------------------------------------
		// Extract auth version from JWT
		//
		// auth_version is used to invalidate all existing access
		// tokens when:
		//   - user is promoted/demoted
		//   - password changes
		//   - sessions are revoked
		//   - security incident occurs
		// ---------------------------------------------------------
		authVersionFloat, ok := claims["auth_version"].(float64)

		if !ok || authVersionFloat < 1 {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "invalid token auth version",
			})
			return
		}

		tokenAuthVersion := int(authVersionFloat)

		// ---------------------------------------------------------
		// Load current user from database
		// ---------------------------------------------------------
		user, err := repo.GetUserByID(userID)

		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "user session is no longer valid",
			})
			return
		}

		// ---------------------------------------------------------
		// CRITICAL SESSION INVALIDATION CHECK
		//
		// JWT auth_version must match the current DB version.
		//
		// Example:
		// JWT -> auth_version = 1
		// DB  -> auth_version = 2
		//
		// The token was issued before sessions were revoked.
		// Therefore reject it immediately.
		// ---------------------------------------------------------
		if tokenAuthVersion != user.AuthVersion {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "session has been revoked, please login again",
			})
			return
		}

		// ---------------------------------------------------------
		// Store authenticated user information in Gin context
		// ---------------------------------------------------------
		c.Set("user_id", user.ID)
		c.Set("email", user.Email)
		c.Set("role", user.Role)
		c.Set("auth_version", user.AuthVersion)

		c.Next()
	}
}