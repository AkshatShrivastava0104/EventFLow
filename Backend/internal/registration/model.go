package registration

import "time"

type Registration struct {
	ID            int64              `json:"id"`
	UserID        int64              `json:"user_id"`
	EventID       int64              `json:"event_id"`
	UserName      string             `json:"user_name"`
	UserEmail     string             `json:"user_email"`
	Quantity      int                `json:"quantity"`
	Status        string             `json:"status"`
	PaymentStatus string             `json:"payment_status"`
	CreatedAt     time.Time          `json:"created_at"`
	Event         *RegistrationEvent `json:"event,omitempty"`
}

type RegistrationEvent struct {
	ID            int64      `json:"id"`
	Title         string     `json:"title"`
	Slug          string     `json:"slug"`
	Description   string     `json:"description"`
	Venue         string     `json:"venue"`
	Address       string     `json:"address"`
	City          string     `json:"city"`
	Country       string     `json:"country"`
	Category      string     `json:"category"`
	CoverImage    string     `json:"cover_image"`
	CoverMediaURL string     `json:"cover_media_url"`
	Featured      bool       `json:"featured"`
	Visibility    string     `json:"visibility"`
	Status        string     `json:"status"`
	Capacity      *int       `json:"capacity"`
	StartTime     *time.Time `json:"start_time"`
	EndTime       *time.Time `json:"end_time"`
	Price         float64    `json:"price"`
}

type RegisterResult struct {
	Status         string `json:"status"`
	RegistrationID *int64 `json:"registration_id,omitempty"`
	WaitlistID     *int64 `json:"waitlist_id,omitempty"`
}

type RegistrationAttendee struct {
	RegistrationID int64     `json:"registration_id"`
	UserID         int64     `json:"user_id"`
	Name           string    `json:"name"`
	Email          string    `json:"email"`
	Status         string    `json:"status"`
	PaymentStatus  string    `json:"payment_status"`
	CreatedAt      time.Time `json:"created_at"`
}

type Pagination struct {
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

type PaginatedAttendees struct {
	Attendees  []RegistrationAttendee `json:"attendees"`
	Pagination Pagination             `json:"pagination"`
}

type PaginatedRegistrations struct {
	Registrations []Registration `json:"registrations"`
	Pagination    Pagination     `json:"pagination"`
}
