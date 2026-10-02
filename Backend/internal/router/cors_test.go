package router

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/AkshatShrivastava0104/EventFlow/internal/config"
	"github.com/gin-gonic/gin"
)

func TestLoginPreflightAllowsDeployedVercelOrigin(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := SetupRouter(nil, &config.Config{}, nil)
	request := httptest.NewRequest(http.MethodOptions, "/api/v1/auth/login", nil)
	request.Header.Set("Origin", "https://event-f-epvryad4x-akumar-be22-thaparedus-projects.vercel.app")
	request.Header.Set("Access-Control-Request-Method", http.MethodPost)
	request.Header.Set("Access-Control-Request-Headers", "content-type,authorization")
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected preflight status %d, got %d", http.StatusNoContent, recorder.Code)
	}
	if got := recorder.Header().Get("Access-Control-Allow-Origin"); got != "https://event-f-epvryad4x-akumar-be22-thaparedus-projects.vercel.app" {
		t.Fatalf("expected preflight to allow deployed origin, got %q", got)
	}
}

func TestLoginPreflightAllowsConfiguredOrigin(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := SetupRouter(nil, &config.Config{
		CORSAllowedOrigins: "https://preview.example.com, https://staging.example.com",
	}, nil)
	request := httptest.NewRequest(http.MethodOptions, "/api/v1/auth/login", nil)
	request.Header.Set("Origin", "https://preview.example.com")
	request.Header.Set("Access-Control-Request-Method", http.MethodPost)
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected preflight status %d, got %d", http.StatusNoContent, recorder.Code)
	}
	if got := recorder.Header().Get("Access-Control-Allow-Origin"); got != "https://preview.example.com" {
		t.Fatalf("expected preflight to allow configured origin, got %q", got)
	}
}
