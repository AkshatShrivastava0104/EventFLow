package queue

import (
	"context"
	"encoding/json"

	"github.com/redis/go-redis/v9"
)

type NotificationJob struct {
	UserID  int64  `json:"user_id"`
	Type    string `json:"type"`
	Message string `json:"message"`
}

type NotificationQueue struct {
	redis *redis.Client
}

func NewNotificationQueue(redisClient *redis.Client) *NotificationQueue {
	return &NotificationQueue{
		redis: redisClient,
	}
}

func (q *NotificationQueue) Enqueue(
	ctx context.Context,
	job NotificationJob,
) error {

	data, err := json.Marshal(job)
	if err != nil {
		return err
	}

	return q.redis.RPush(
		ctx,
		"notification_queue",
		data,
	).Err()
}