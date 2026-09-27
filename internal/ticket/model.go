package ticket

import "time"

type Ticket struct {
	ID             int64     `json:"id"`
	RegistrationID int64     `json:"registration_id"`
	QRCode         string    `json:"qr_code"`
	TicketNumber   string    `json:"ticket_number"`
	CreatedAt      time.Time `json:"created_at"`
}