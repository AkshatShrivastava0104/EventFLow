package outbox

import "time"

type OutboxEvent struct {
	ID            int64      `json:"id"`
	EventType     string     `json:"event_type"`
	AggregateType string     `json:"aggregate_type"`
	AggregateID   string     `json:"aggregate_id"`
	Payload       []byte     `json:"payload"`
	Status        string     `json:"status"`
	Attempts      int        `json:"attempts"`
	AvailableAt   time.Time  `json:"available_at"`
	ProcessedAt   *time.Time `json:"processed_at,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}