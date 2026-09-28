package admin

import "time"

// Totals holds platform-wide aggregate counts.
type Totals struct {
	Users         int `json:"users"`
	Admins        int `json:"admins"`
	Organizations int `json:"organizations"`
	Events        int `json:"events"`
	Registrations int `json:"registrations"`
	Tickets       int `json:"tickets"`
	Checkins      int `json:"checkins"`
}

// TrendPoint is a single day in the platform activity time-series.
type TrendPoint struct {
	Date          string `json:"date"`
	Users         int    `json:"users"`
	Events        int    `json:"events"`
	Registrations int    `json:"registrations"`
}

// PlatformStats is the payload for GET /admin/stats.
type PlatformStats struct {
	Totals                Totals         `json:"totals"`
	EventsByStatus        map[string]int `json:"events_by_status"`
	RegistrationsByStatus map[string]int `json:"registrations_by_status"`
	NewUsers30d           int            `json:"new_users30d"`
	NewEvents30d          int            `json:"new_events30d"`
	NewRegistrations30d   int            `json:"new_registrations30d"`
	CheckinRate           float64        `json:"checkin_rate"`
	Trend                 []TrendPoint   `json:"trend"`
}

// AdminOrganization is an organization row enriched with owner and counts.
type AdminOrganization struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Website     string    `json:"website"`
	OwnerID     *int64    `json:"owner_id"`
	OwnerName   string    `json:"owner_name"`
	OwnerEmail  string    `json:"owner_email"`
	MemberCount int       `json:"member_count"`
	EventCount  int       `json:"event_count"`
	CreatedAt   time.Time `json:"created_at"`
}

// AdminUser is a user row enriched with membership and registration counts.
type AdminUser struct {
	ID                int64     `json:"id"`
	Name              string    `json:"name"`
	Email             string    `json:"email"`
	Role              string    `json:"role"`
	EmailVerified     bool      `json:"email_verified"`
	OrgCount          int       `json:"org_count"`
	RegistrationCount int       `json:"registration_count"`
	CreatedAt         time.Time `json:"created_at"`
}

// AdminRegistration represents a platform-owner view of a registration.
//
// This is intentionally read-only. It contains the registration,
// event, organization, ticket and check-in information required by
// the owner dashboard.
type AdminRegistration struct {
	ID               int64  `json:"id"`
	UserID           int64  `json:"user_id"`
	UserName         string  `json:"user_name"`
	UserEmail        string  `json:"user_email"`
	EventID          int64  `json:"event_id"`
	EventTitle       string  `json:"event_title"`
	OrganizationID   int64  `json:"organization_id"`
	OrganizationName string  `json:"organization_name"`

	RegistrationStatus string    `json:"registration_status"`
	PaymentStatus      string    `json:"payment_status"`
	RegisteredAt       time.Time `json:"registered_at"`

	Ticket  *AdminRegistrationTicket  `json:"ticket,omitempty"`
	Checkin *AdminRegistrationCheckin `json:"checkin,omitempty"`

	Activity []AdminRegistrationActivity `json:"activity"`
}

// AdminRegistrationTicket contains ticket information linked to a registration.
type AdminRegistrationTicket struct {
	ID           int64     `json:"id"`
	TicketNumber string    `json:"ticket_number"`
	QRCode       string    `json:"qr_code"`
	CreatedAt    time.Time `json:"created_at"`
}

// AdminRegistrationCheckin contains the actual check-in record.
type AdminRegistrationCheckin struct {
	ID             int64     `json:"id"`
	TicketID       int64     `json:"ticket_id"`
	VolunteerID    *int64    `json:"volunteer_id,omitempty"`
	VolunteerName  string    `json:"volunteer_name,omitempty"`
	VolunteerEmail string    `json:"volunteer_email,omitempty"`
	CheckedInAt    time.Time `json:"checked_in_at"`
}

// AdminRegistrationActivity represents a real activity derived from
// persisted registration/ticket/check-in records.
type AdminRegistrationActivity struct {
	Type        string    `json:"type"`
	Label       string    `json:"label"`
	OccurredAt  time.Time `json:"occurred_at"`
	Description string    `json:"description,omitempty"`
}

// Pagination is shared by admin paginated endpoints.
type Pagination struct {
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

type PaginatedOrganizations struct {
	Organizations []AdminOrganization `json:"organizations"`
	Pagination    Pagination          `json:"pagination"`
}

type PaginatedUsers struct {
	Users      []AdminUser `json:"users"`
	Pagination Pagination  `json:"pagination"`
}

// PaginatedRegistrations is the platform-owner registrations response.
type PaginatedRegistrations struct {
	Registrations []AdminRegistration `json:"registrations"`
	Pagination    Pagination           `json:"pagination"`
}