package ratelimit

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

type memoryCounter struct {
	mu       sync.Mutex
	counts   map[string]int64
	duration time.Duration
	err      error
}

func (counter *memoryCounter) Increment(
	_ context.Context,
	key string,
	expiration time.Duration,
) (int64, time.Duration, error) {
	counter.mu.Lock()
	defer counter.mu.Unlock()

	if counter.err != nil {
		return 0, 0, counter.err
	}
	if counter.counts == nil {
		counter.counts = make(map[string]int64)
	}
	counter.counts[key]++
	counter.duration = expiration
	return counter.counts[key], expiration, nil
}

func TestMiddlewareEnforcesLimitPerIPAndReturns429(t *testing.T) {
	gin.SetMode(gin.TestMode)

	counter := &memoryCounter{}
	router := gin.New()
	handlerCalls := 0
	router.Use(Middleware(counter, "api", 100, time.Minute))
	router.GET("/", func(c *gin.Context) {
		handlerCalls++
		c.Status(http.StatusNoContent)
	})

	for request := 0; request < 100; request++ {
		response := performRequest(router, "192.0.2.10")
		if response.Code != http.StatusNoContent {
			t.Fatalf("request %d status = %d, want %d", request+1, response.Code, http.StatusNoContent)
		}
	}
	if counter.duration != time.Minute {
		t.Fatalf("counter expiry = %s, want %s", counter.duration, time.Minute)
	}

	limited := performRequest(router, "192.0.2.10")
	if limited.Code != http.StatusTooManyRequests {
		t.Fatalf("request above limit status = %d, want %d", limited.Code, http.StatusTooManyRequests)
	}
	if limited.Header().Get("Retry-After") == "" {
		t.Fatal("rate-limited response has no Retry-After header")
	}
	if got := limited.Header().Get("X-RateLimit-Limit"); got != "100" {
		t.Fatalf("rate-limit header = %q, want 100", got)
	}
	if handlerCalls != 100 {
		t.Fatalf("handler called %d times, want 100", handlerCalls)
	}

	otherIP := performRequest(router, "192.0.2.11")
	if otherIP.Code != http.StatusNoContent {
		t.Fatalf("request from another IP status = %d, want %d", otherIP.Code, http.StatusNoContent)
	}
}

func TestAuthEndpointsShareTenPerMinuteLimitPerIP(t *testing.T) {
	gin.SetMode(gin.TestMode)

	counter := &memoryCounter{}
	authLimiter := Middleware(counter, "auth", 10, time.Minute)
	router := gin.New()
	router.POST("/login", authLimiter, func(c *gin.Context) {
		c.Status(http.StatusNoContent)
	})
	router.POST("/refresh", authLimiter, func(c *gin.Context) {
		c.Status(http.StatusNoContent)
	})

	for request := 0; request < 10; request++ {
		path := "/login"
		if request%2 != 0 {
			path = "/refresh"
		}
		response := performRequestOnPath(router, path, "198.51.100.8")
		if response.Code != http.StatusNoContent {
			t.Fatalf("auth request %d status = %d, want %d", request+1, response.Code, http.StatusNoContent)
		}
	}

	limited := performRequestOnPath(router, "/refresh", "198.51.100.8")
	if limited.Code != http.StatusTooManyRequests {
		t.Fatalf("eleventh combined auth request status = %d, want %d", limited.Code, http.StatusTooManyRequests)
	}
}

func TestMiddlewareReturns503WhenCounterFails(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(Middleware(&memoryCounter{err: errors.New("Redis unavailable")}, "api", 100, time.Minute))
	router.GET("/", func(c *gin.Context) {
		c.Status(http.StatusNoContent)
	})

	response := performRequest(router, "192.0.2.12")
	if response.Code != http.StatusServiceUnavailable {
		t.Fatalf("counter failure status = %d, want %d", response.Code, http.StatusServiceUnavailable)
	}
}

func TestClientIPUsesForwardedAddressOnlyForTrustedProxy(t *testing.T) {
	gin.SetMode(gin.TestMode)

	counter := &memoryCounter{}
	router := gin.New()
	if err := router.SetTrustedProxies([]string{"127.0.0.1"}); err != nil {
		t.Fatalf("configure trusted proxy: %v", err)
	}
	router.Use(Middleware(counter, "api", 100, time.Minute))
	router.GET("/", func(c *gin.Context) {
		c.Status(http.StatusNoContent)
	})

	untrustedProxyRequest := httptest.NewRequest(http.MethodGet, "/", nil)
	untrustedProxyRequest.RemoteAddr = "192.0.2.20:12345"
	untrustedProxyRequest.Header.Set("X-Forwarded-For", "203.0.113.90")
	router.ServeHTTP(httptest.NewRecorder(), untrustedProxyRequest)
	router.ServeHTTP(httptest.NewRecorder(), untrustedProxyRequest.Clone(untrustedProxyRequest.Context()))

	trustedProxyRequest := httptest.NewRequest(http.MethodGet, "/", nil)
	trustedProxyRequest.RemoteAddr = "127.0.0.1:12345"
	trustedProxyRequest.Header.Set("X-Forwarded-For", "198.51.100.40")
	router.ServeHTTP(httptest.NewRecorder(), trustedProxyRequest)

	untrustedIPKey := "eventflow:rate-limit:api:192.0.2.20"
	trustedForwardedIPKey := "eventflow:rate-limit:api:198.51.100.40"
	if counter.counts[untrustedIPKey] != 2 {
		t.Fatalf("untrusted proxy requests counted under %q: %d", untrustedIPKey, counter.counts[untrustedIPKey])
	}
	if counter.counts[trustedForwardedIPKey] != 1 {
		t.Fatalf("trusted proxy request count under %q = %d, want 1", trustedForwardedIPKey, counter.counts[trustedForwardedIPKey])
	}
}

func TestRedisCounterUsesAtomicIncrementAndExpiry(t *testing.T) {
	client := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		t.Skipf("Redis integration test requires localhost:6379: %v", err)
	}
	defer client.Close()

	key := fmt.Sprintf("eventflow:test:rate-limit:%d", time.Now().UnixNano())
	t.Cleanup(func() {
		_ = client.Del(context.Background(), key).Err()
	})

	counter := NewRedisCounter(client)
	firstCount, firstTTL, err := counter.Increment(ctx, key, time.Minute)
	if err != nil {
		t.Fatalf("first Redis increment: %v", err)
	}
	if firstCount != 1 || firstTTL <= 0 || firstTTL > time.Minute {
		t.Fatalf("first increment count/TTL = %d/%s, want 1 and positive <= 1m", firstCount, firstTTL)
	}

	secondCount, secondTTL, err := counter.Increment(ctx, key, time.Minute)
	if err != nil {
		t.Fatalf("second Redis increment: %v", err)
	}
	if secondCount != 2 || secondTTL <= 0 || secondTTL > time.Minute {
		t.Fatalf("second increment count/TTL = %d/%s, want 2 and positive <= 1m", secondCount, secondTTL)
	}
}

func performRequest(router http.Handler, ip string) *httptest.ResponseRecorder {
	return performRequestOnPath(router, "/", ip)
}

func performRequestOnPath(router http.Handler, path, ip string) *httptest.ResponseRecorder {
	method := http.MethodGet
	if path != "/" {
		method = http.MethodPost
	}
	request := httptest.NewRequest(method, path, nil)
	request.RemoteAddr = ip + ":12345"
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	return response
}
