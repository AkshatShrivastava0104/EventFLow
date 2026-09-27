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