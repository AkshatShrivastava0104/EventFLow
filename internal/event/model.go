package event

import "time"

type Event struct {
	ID                   int64      `json:"id"`
	OrganizationID       int64      `json:"organization_id"`
	Title                string     `json:"title"`
	Description          string     `json:"description"`
	Venue                string     `json:"venue"`
	Capacity             *int       `json:"capacity"`
	RegistrationDeadline *time.Time `json:"registration_deadline"`
	StartTime            *time.Time `json:"start_time"`
	EndTime              *time.Time `json:"end_time"`
	Status               string     `json:"status"`
	CreatedAt            time.Time  `json:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at"`
}

type Pagination struct {
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

type PaginatedEvents struct {
	Events     []Event    `json:"events"`
	Pagination Pagination `json:"pagination"`
}