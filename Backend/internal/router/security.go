package router

import (
	"log"
	"net/url"
	"strings"

	"github.com/gin-gonic/gin"
)

const productionFrontendOrigin = "https://eventflowak.vercel.app"

func corsAllowedOrigins(appEnv, configured string) []string {
	origins := map[string]struct{}{
		productionFrontendOrigin: {},
	}

	if strings.EqualFold(strings.TrimSpace(appEnv), "development") {
		for _, origin := range []string{
			"http://localhost:5173",
			"http://127.0.0.1:5173",
			"http://localhost:4173",
			"http://127.0.0.1:4173",
		} {
			origins[origin] = struct{}{}
		}
	}

	for _, value := range strings.Split(configured, ",") {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}

		origin, ok := normalizeTrustedOrigin(value, appEnv)
		if !ok {
			log.Printf("ignoring invalid CORS origin %q", value)
			continue
		}
		origins[origin] = struct{}{}
	}

	result := make([]string, 0, len(origins))
	for origin := range origins {
		result = append(result, origin)
	}
	return result
}

func normalizeTrustedOrigin(value, appEnv string) (string, bool) {
	parsed, err := url.Parse(value)
	if err != nil || parsed.Host == "" || parsed.User != nil ||
		parsed.RawQuery != "" || parsed.ForceQuery || parsed.Fragment != "" ||
		parsed.RawFragment != "" || parsed.Opaque != "" || parsed.Path != "" {
		return "", false
	}

	scheme := strings.ToLower(parsed.Scheme)
	host := strings.ToLower(parsed.Host)
	hostname := strings.ToLower(parsed.Hostname())
	if hostname == "" || strings.Contains(host, "*") {
		return "", false
	}
	if scheme != "https" {
		isLoopback := hostname == "localhost" || hostname == "127.0.0.1" || hostname == "::1"
		if scheme != "http" || !isLoopback ||
			!strings.EqualFold(strings.TrimSpace(appEnv), "development") {
			return "", false
		}
	}

	return scheme + "://" + host, true
}

func securityHeaders(appEnv string) gin.HandlerFunc {
	production := strings.EqualFold(strings.TrimSpace(appEnv), "production")

	return func(c *gin.Context) {
		header := c.Writer.Header()
		header.Set("X-Content-Type-Options", "nosniff")
		header.Set("X-Frame-Options", "DENY")
		header.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		header.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		header.Set("X-Permitted-Cross-Domain-Policies", "none")
		header.Set("X-XSS-Protection", "0")

		if strings.HasPrefix(c.Request.URL.Path, "/swagger/") {
			header.Set(
				"Content-Security-Policy",
				"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
			)
		} else {
			header.Set(
				"Content-Security-Policy",
				"default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
			)
		}

		if production {
			header.Set("Strict-Transport-Security", "max-age=31536000")
		}

		c.Next()
	}
}
