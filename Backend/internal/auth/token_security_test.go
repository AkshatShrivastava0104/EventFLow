package auth

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/AkshatShrivastava0104/EventFlow/internal/config"
	apperrors "github.com/AkshatShrivastava0104/EventFlow/internal/errors"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

const testJWTSecret = "test-jwt-secret-that-is-at-least-32-bytes"

func TestAuthMiddlewareRejectsRefreshAndUntypedTokens(t *testing.T) {
	for _, tokenType := range []string{refreshTokenType, ""} {
		t.Run(tokenType, func(t *testing.T) {
			token := signedTestToken(t, tokenType)
			router := gin.New()
			protectedHandlerCalled := false
			router.Use(NewAuthMiddleware(
				&config.Config{JWTSecret: testJWTSecret},
				nil,
			))
			router.GET("/protected", func(c *gin.Context) {
				protectedHandlerCalled = true
				c.Status(http.StatusNoContent)
			})

			request := httptest.NewRequest(http.MethodGet, "/protected", nil)
			request.Header.Set("Authorization", "Bearer "+token)
			response := httptest.NewRecorder()
			router.ServeHTTP(response, request)

			if response.Code != http.StatusUnauthorized {
				t.Fatalf("status = %d, want %d", response.Code, http.StatusUnauthorized)
			}
			if protectedHandlerCalled {
				t.Fatal("protected handler ran for a non-access token")
			}
		})
	}
}

func TestRefreshAccessTokenRejectsAccessAndUntypedTokens(t *testing.T) {
	service := NewService(nil, &config.Config{JWTSecret: testJWTSecret})

	for _, tokenType := range []string{accessTokenType, ""} {
		t.Run(tokenType, func(t *testing.T) {
			token := signedTestToken(t, tokenType)

			if _, err := service.RefreshAccessToken(context.Background(), token); err != apperrors.ErrUnauthorized {
				t.Fatalf("RefreshAccessToken() error = %v, want %v", err, apperrors.ErrUnauthorized)
			}
		})
	}
}

func signedTestToken(t *testing.T, tokenType string) string {
	t.Helper()

	claims := jwt.MapClaims{
		"user_id":      1,
		"auth_version": 1,
		"exp":          time.Now().Add(time.Minute).Unix(),
	}
	if tokenType != "" {
		claims["token_type"] = tokenType
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(testJWTSecret))
	if err != nil {
		t.Fatalf("sign test JWT: %v", err)
	}
	return signed
}
