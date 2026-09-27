package worker

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/AkshatShrivastava0104/EventFlow/internal/notification"
	"github.com/redis/go-redis/v9"
)

type NotificationWorker struct {
	redisClient          *redis.Client
	notificationService  *notification.Service
}

func NewNotificationWorker(
	redisClient *redis.Client,
	notificationService *notification.Service,
) *NotificationWorker {
	return &NotificationWorker{
		redisClient:         redisClient,
		notificationService: notificationService,
	}
}

func (w *NotificationWorker) Start(ctx context.Context) {

	log.Println("notification worker started")

	for {

		select {
		case <-ctx.Done():
			log.Println("notification worker stopped")
			return

		default:
		}

		result, err := w.redisClient.BLPop(
			ctx,
			5*time.Second,
			"notification_queue",
		).Result()

		if err != nil {

			if err == redis.Nil {
				continue
			}

			log.Println("notification queue error:", err)
			continue
		}

		// result[0] = queue name
		// result[1] = job data
		if len(result) != 2 {
			continue
		}

		var job struct {
			UserID  int64  `json:"user_id"`
			Type    string `json:"type"`
			Message string `json:"message"`
		}

		if err := json.Unmarshal(
			[]byte(result[1]),
			&job,
		); err != nil {
			log.Println("failed to decode notification job:", err)
			continue
		}

		_, err = w.notificationService.CreateNotification(
			ctx,
			job.UserID,
			job.Type,
			job.Message,
		)

		if err != nil {
			log.Println("failed to create notification:", err)
			continue
		}

		log.Println(
			"notification processed for user:",
			job.UserID,
		)
	}
}