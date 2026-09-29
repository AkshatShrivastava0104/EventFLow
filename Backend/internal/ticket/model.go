package ticket

import "time"

type Ticket struct {
	ID             int64     `json:"id"`
	RegistrationID int64     `json:"registration_id"`
	QRCode         string    `json:"qr_code"`
	TicketNumber   string    `json:"ticket_number"`
	CreatedAt      time.Time `json:"created_at"`
}

// MyTicket is a ticket enriched with its event and attendee details
// for the attendee's ticket view.
type MyTicket struct {
	ID                 int64     `json:"id"`
	RegistrationID     int64     `json:"registration_id"`
	QRCode             string    `json:"qr_code"`
	QRCodeURL          string    `json:"qr_code_url"`
	TicketNumber       string    `json:"ticket_number"`
	RegistrationStatus string    `json:"registration_status"`
	CreatedAt          time.Time `json:"created_at"`

	// Event details
	EventID       int64      `json:"event_id"`
	EventTitle    string     `json:"event_title"`
	EventCategory string     `json:"event_category"`
	EventVenue    string     `json:"event_venue"`
	EventAddress  string     `json:"event_address"`
	EventCity     string     `json:"event_city"`
	EventCountry  string     `json:"event_country"`
	EventStatus   string     `json:"event_status"`
	EventStart    *time.Time `json:"event_start"`
	EventEnd      *time.Time `json:"event_end"`

	// Attendee details
	AttendeeName  string `json:"attendee_name"`
	AttendeeEmail string `json:"attendee_email"`

	// Check-in details
	CheckedIn   bool       `json:"checked_in"`
	CheckedInAt *time.Time `json:"checked_in_at"`
}