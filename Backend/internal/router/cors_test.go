package router

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/AkshatShrivastava0104/EventFlow/internal/config"
	"github.com/gin-gonic/gin"
)

func TestEventMediaPreflightAllowsProductionFrontendAndSecurityHeaders(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := SetupRouter(nil, &config.Config{AppEnv: "production"}, nil)
	request := httptest.NewRequest(http.MethodOptions, "/api/v1/events/2/media", nil)
	request.Header.Set("Origin", productionFrontendOrigin)
	request.Header.Set("Access-Control-Request-Method", http.MethodPost)
	request.Header.Set("Access-Control-Request-Headers", "content-type,authorization")
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected preflight status %d, got %d", http.StatusNoContent, recorder.Code)
	}
	if got := recorder.Header().Get("Access-Control-Allow-Origin"); got != productionFrontendOrigin {
		t.Fatalf("expected allowed origin %q, got %q", productionFrontendOrigin, got)
	}
	if got := recorder.Header().Values("Access-Control-Allow-Origin"); len(got) != 1 {
		t.Fatalf("expected exactly one CORS allow-origin header, got %v", got)
	}
	if got := recorder.Header().Get("Access-Control-Allow-Credentials"); got != "true" {
		t.Fatalf("expected credentials to be allowed, got %q", got)
	}
	if got := strings.ToUpper(recorder.Header().Get("Access-Control-Allow-Methods")); !strings.Contains(got, "POST") {
		t.Fatalf("expected POST to be allowed, got %q", got)
	}
	if got := strings.ToLower(recorder.Header().Get("Access-Control-Allow-Headers")); !strings.Contains(got, "authorization") ||
		!strings.Contains(got, "content-type") {
		t.Fatalf("expected JWT and JSON headers to be allowed, got %q", got)
	}
	if got := recorder.Header().Get("Strict-Transport-Security"); got != "max-age=31536000" {
		t.Fatalf("expected production HSTS header, got %q", got)
	}

	assertSecurityHeaders(t, recorder)
}

func TestPreflightRejectsUntrustedOrigin(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := SetupRouter(nil, &config.Config{AppEnv: "production"}, nil)
	request := httptest.NewRequest(http.MethodOptions, "/api/v1/events/2/media", nil)
	request.Header.Set("Origin", "https://attacker.example")
	request.Header.Set("Access-Control-Request-Method", http.MethodPost)
	request.Header.Set("Access-Control-Request-Headers", "authorization,content-type")
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected untrusted preflight status %d, got %d", http.StatusForbidden, recorder.Code)
	}
	if got := recorder.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Fatalf("untrusted origin unexpectedly received CORS permission %q", got)
	}
	assertSecurityHeaders(t, recorder)
}

func TestConfiguredProductionOriginIsAllowedExactly(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := SetupRouter(nil, &config.Config{
		AppEnv:             "production",
		CORSAllowedOrigins: "https://eventflow-preview.example",
	}, nil)
	request := httptest.NewRequest(http.MethodOptions, "/api/v1/auth/login", nil)
	request.Header.Set("Origin", "https://eventflow-preview.example")
	request.Header.Set("Access-Control-Request-Method", http.MethodPost)
	request.Header.Set("Access-Control-Request-Headers", "content-type")
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected configured-origin preflight status %d, got %d", http.StatusNoContent, recorder.Code)
	}
	if got := recorder.Header().Get("Access-Control-Allow-Origin"); got != "https://eventflow-preview.example" {
		t.Fatalf("expected explicitly configured origin, got %q", got)
	}
}

func TestCorsAllowedOriginsAreValidatedAndDevelopmentOriginsAreEnvironmentScoped(t *testing.T) {
	productionOrigins := corsAllowedOrigins(
		"production",
		"https://trusted.example, https://trusted.example, https://bad.example/path, *, http://localhost:5173",
	)
	if !containsOrigin(productionOrigins, "https://trusted.example") {
		t.Fatal("expected configured trusted origin")
	}
	for _, origin := range []string{
		"http://localhost:5173",
		"https://bad.example/path",
		"*",
		"https://event-f-epvryad4x-akumar-be22-thaparedus-projects.vercel.app",
	} {
		if containsOrigin(productionOrigins, origin) {
			t.Fatalf("origin %q must not be allowed in production", origin)
		}
	}

	developmentOrigins := corsAllowedOrigins("development", "")
	if !containsOrigin(developmentOrigins, "http://localhost:5173") {
		t.Fatal("expected localhost origin in development")
	}
}

func TestSecurityHeadersSetOnProductionResponsesOnly(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(securityHeaders("development"))
	router.GET("/health", func(c *gin.Context) {
		c.Status(http.StatusNoContent)
	})
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/health", nil))

	assertSecurityHeaders(t, recorder)
	if got := recorder.Header().Get("Strict-Transport-Security"); got != "" {
		t.Fatalf("development response must not set HSTS, got %q", got)
	}
}

func TestSwaggerGetsItsOwnContentSecurityPolicy(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(securityHeaders("production"))
	router.GET("/swagger/index.html", func(c *gin.Context) {
		c.Status(http.StatusNoContent)
	})
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/swagger/index.html", nil))

	policy := recorder.Header().Get("Content-Security-Policy")
	if !strings.Contains(policy, "script-src 'self' 'unsafe-inline'") ||
		!strings.Contains(policy, "frame-ancestors 'none'") {
		t.Fatalf("unexpected Swagger CSP: %q", policy)
	}
}

func assertSecurityHeaders(t *testing.T, recorder *httptest.ResponseRecorder) {
	t.Helper()

	want := map[string]string{
		"Content-Security-Policy":           "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
		"Permissions-Policy":                "camera=(), microphone=(), geolocation=()",
		"Referrer-Policy":                   "strict-origin-when-cross-origin",
		"X-Content-Type-Options":            "nosniff",
		"X-Frame-Options":                   "DENY",
		"X-Permitted-Cross-Domain-Policies": "none",
		"X-XSS-Protection":                  "0",
	}
	for name, value := range want {
		if got := recorder.Header().Get(name); got != value {
			t.Errorf("expected %s=%q, got %q", name, value, got)
		}
	}
}

func containsOrigin(origins []string, target string) bool {
	for _, origin := range origins {
		if origin == target {
			return true
		}
	}
	return false
}
