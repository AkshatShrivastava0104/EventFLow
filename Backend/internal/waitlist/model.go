package waitlist

import "time"

type WaitlistEntry struct {
	ID        int64     `json:"id"`
	UserID    int64     `json:"user_id"`
	EventID   int64     `json:"event_id"`
	Position  int       `json:"position"`
	CreatedAt time.Time `json:"created_at"`
}