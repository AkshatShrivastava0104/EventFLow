package ratelimit

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

const incrementScript = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
return {count, redis.call("PTTL", KEYS[1])}
`

var rateLimitScript = redis.NewScript(incrementScript)

type Counter interface {
	Increment(ctx context.Context, key string, expiration time.Duration) (int64, time.Duration, error)
}

type RedisCounter struct {
	client *redis.Client
}

func NewRedisCounter(client *redis.Client) *RedisCounter {
	return &RedisCounter{client: client}
}

func (counter *RedisCounter) Increment(
	ctx context.Context,
	key string,
	expiration time.Duration,
) (int64, time.Duration, error) {
	if counter == nil || counter.client == nil {
		return 0, 0, fmt.Errorf("rate-limit Redis client is unavailable")
	}

	result, err := rateLimitScript.
		Run(ctx, counter.client, []string{key}, expiration.Milliseconds()).
		Slice()
	if err != nil {
		return 0, 0, err
	}
	if len(result) != 2 {
		return 0, 0, fmt.Errorf("unexpected rate-limit Redis response")
	}

	count, err := redisInteger(result[0])
	if err != nil {
		return 0, 0, fmt.Errorf("parse rate-limit counter: %w", err)
	}
	ttlMilliseconds, err := redisInteger(result[1])
	if err != nil {
		return 0, 0, fmt.Errorf("parse rate-limit expiry: %w", err)
	}

	return count, time.Duration(ttlMilliseconds) * time.Millisecond, nil
}

func Middleware(counter Counter, name string, limit int64, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		if counter == nil {
			c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{
				"error": "rate limiter is unavailable",
			})
			return
		}

		clientIP := c.ClientIP()
		if clientIP == "" {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{
				"error": "unable to determine client IP",
			})
			return
		}

		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()

		key := fmt.Sprintf("eventflow:rate-limit:%s:%s", name, clientIP)
		count, ttl, err := counter.Increment(ctx, key, window)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{
				"error": "rate limiter is unavailable",
			})
			return
		}

		remaining := limit - count
		if remaining < 0 {
			remaining = 0
		}
		c.Header("X-RateLimit-Limit", strconv.FormatInt(limit, 10))
		c.Header("X-RateLimit-Remaining", strconv.FormatInt(remaining, 10))

		if count > limit {
			retryAfter := int64((ttl + time.Second - 1) / time.Second)
			if retryAfter < 1 {
				retryAfter = 1
			}
			c.Header("Retry-After", strconv.FormatInt(retryAfter, 10))
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "too many requests",
			})
			return
		}

		c.Next()
	}
}

func redisInteger(value interface{}) (int64, error) {
	switch number := value.(type) {
	case int64:
		return number, nil
	case string:
		return strconv.ParseInt(number, 10, 64)
	case []byte:
		return strconv.ParseInt(string(number), 10, 64)
	default:
		return 0, fmt.Errorf("unexpected Redis integer type %T", value)
	}
}
