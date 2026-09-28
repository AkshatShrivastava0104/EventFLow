package systemhealth

import (
	"context"
	"time"

	"github.com/AkshatShrivastava0104/EventFlow/internal/config"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type Service struct {
	db    *pgxpool.Pool
	redis *redis.Client
	cfg   *config.Config
}

func NewService(
	db *pgxpool.Pool,
	redisClient *redis.Client,
	cfg *config.Config,
) *Service {
	return &Service{
		db:    db,
		redis: redisClient,
		cfg:   cfg,
	}
}

func (s *Service) GetHealth(ctx context.Context) *SystemHealth {
	now := time.Now()

	result := &SystemHealth{
		Status:      "healthy",
		Environment: s.cfg.AppEnv,
		AppName:     s.cfg.AppName,
		Timestamp:   now,
		API: ComponentHealth{
			Status:      "healthy",
			LatencyMS:   0,
			Message:     "API is responding",
			LastChecked: now,
		},
	}

	// ==================================================
	// Database
	// ==================================================

	dbStart := time.Now()

	dbCtx, dbCancel := context.WithTimeout(
		ctx,
		2*time.Second,
	)
	defer dbCancel()

	dbErr := s.db.Ping(dbCtx)

	dbLatency := time.Since(dbStart).Milliseconds()

	if dbErr != nil {
		result.Database = ComponentHealth{
			Status:      "unhealthy",
			LatencyMS:   dbLatency,
			Message:     "database ping failed",
			LastChecked: time.Now(),
		}

		result.Status = "degraded"
	} else {
		result.Database = ComponentHealth{
			Status:      "healthy",
			LatencyMS:   dbLatency,
			Message:     "database connection is healthy",
			LastChecked: time.Now(),
		}
	}

	// ==================================================
	// Redis
	// ==================================================

	redisStart := time.Now()

	redisCtx, redisCancel := context.WithTimeout(
		ctx,
		2*time.Second,
	)
	defer redisCancel()

	redisErr := s.redis.Ping(redisCtx).Err()

	redisLatency := time.Since(redisStart).Milliseconds()

	if redisErr != nil {
		result.Redis = ComponentHealth{
			Status:      "unhealthy",
			LatencyMS:   redisLatency,
			Message:     "redis ping failed",
			LastChecked: time.Now(),
		}

		result.Status = "degraded"
	} else {
		result.Redis = ComponentHealth{
			Status:      "healthy",
			LatencyMS:   redisLatency,
			Message:     "redis connection is healthy",
			LastChecked: time.Now(),
		}
	}

	// ==================================================
	// Overall status
	// ==================================================

	if result.Database.Status == "unhealthy" &&
		result.Redis.Status == "unhealthy" {
		result.Status = "unhealthy"
	}

	return result
}