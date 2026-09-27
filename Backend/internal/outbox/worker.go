package outbox

import (
	"context"
	"log"
	"time"
)

type Worker struct {
	service *Service
}

func NewWorker(service *Service) *Worker {
	return &Worker{
		service: service,
	}
}

func (w *Worker) Start(ctx context.Context) {

	log.Println("outbox worker started")

	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {

		case <-ctx.Done():
			log.Println("outbox worker stopped")
			return

		case <-ticker.C:

			if err := w.service.PublishPendingEvents(ctx); err != nil {
				log.Println(
					"outbox worker error:",
					err,
				)
			}
		}
	}
}