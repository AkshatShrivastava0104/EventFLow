package outbox

import (
	"context"
	"encoding/json"
	"time"

	"github.com/AkshatShrivastava0104/EventFlow/internal/queue"
)

type Service struct {
	repo *Repository
	queue *queue.NotificationQueue
}

func NewService(
	repo *Repository,
	notificationQueue *queue.NotificationQueue,
) *Service {
	return &Service{
		repo:  repo,
		queue: notificationQueue,
	}
}

func (s *Service) PublishPendingEvents(
	ctx context.Context,
) error {

	events, err := s.repo.ClaimPendingEvents(
		ctx,
		50,
	)

	if err != nil {
		return err
	}

	for _, event := range events {

		if event.EventType != "NOTIFICATION" {
			// Unknown event type: don't leave it stuck forever.
			nextAttempt := event.Attempts + 1

			_ = s.repo.MarkFailed(
				ctx,
				event.ID,
				nextAttempt,
				time.Now().Add(30*time.Second),
			)

			continue
		}

		var job queue.NotificationJob

		if err := json.Unmarshal(
			event.Payload,
			&job,
		); err != nil {

			nextAttempt := event.Attempts + 1

			_ = s.repo.MarkFailed(
				ctx,
				event.ID,
				nextAttempt,
				time.Now().Add(30*time.Second),
			)

			continue
		}

		if err := s.queue.Enqueue(
			ctx,
			job,
		); err != nil {

			nextAttempt := event.Attempts + 1

			backoff := time.Duration(1<<min(nextAttempt, 5)) * time.Second

			_ = s.repo.MarkFailed(
				ctx,
				event.ID,
				nextAttempt,
				time.Now().Add(backoff),
			)

			continue
		}

		if err := s.repo.MarkProcessed(
			ctx,
			event.ID,
		); err != nil {
			return err
		}
	}

	return nil
}