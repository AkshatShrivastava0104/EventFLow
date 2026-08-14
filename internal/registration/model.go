package registration

import "time"

type Registration struct {
	ID            int64     `json:"id"`
	UserID        int64     `json:"user_id"`
	EventID       int64     `json:"event_id"`
	Status        string    `json:"status"`
	PaymentStatus string    `json:"payment_status"`
	CreatedAt     time.Time `json:"created_at"`
}