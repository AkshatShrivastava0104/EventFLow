package cache

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

type RedisClient struct {
	Client *redis.Client
}

func NewRedisClient(host string, port string) *RedisClient {
	client := redis.NewClient(&redis.Options{
		Addr: host + ":" + port,
	})

	return &RedisClient{
		Client: client,
	}
}

func (r *RedisClient) Ping(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	return r.Client.Ping(ctx).Err()
}

func (r *RedisClient) Close() error {
	return r.Client.Close()
}