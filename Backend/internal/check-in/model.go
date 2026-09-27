package checkin

import "time"

type Checkin struct {
	ID          int64     `json:"id"`
	TicketID    int64     `json:"ticket_id"`
	VolunteerID *int64    `json:"volunteer_id,omitempty"`
	CheckedInAt time.Time `json:"checked_in_at"`
}