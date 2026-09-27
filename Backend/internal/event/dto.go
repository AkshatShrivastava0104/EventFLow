package event

import "time"

type CreateEventRequest struct {
	Title                string     `json:"title" binding:"required"`
	Slug                 string     `json:"slug"`
	Description          string     `json:"description"`
	Venue                string     `json:"venue"`
	Address              string     `json:"address"`
	City                 string     `json:"city"`
	Country              string     `json:"country"`
	Category             string     `json:"category"`
	CoverImage           string     `json:"cover_image"`
	Tags                 []string   `json:"tags"`
	Featured             bool       `json:"featured"`
	Visibility           string     `json:"visibility"`
	Capacity             *int       `json:"capacity"`
	MaxTicketsPerUser    *int       `json:"max_tickets_per_user"`
	AllowWaitlist        bool       `json:"allow_waitlist"`
	RegistrationDeadline *time.Time  `json:"registration_deadline"`
	StartTime            *time.Time  `json:"start_time"`
	EndTime              *time.Time  `json:"end_time"`
	Price                float64    `json:"price"`
}

type UpdateEventRequest struct {
	Title                string     `json:"title"`
	Slug                 string     `json:"slug"`
	Description          string     `json:"description"`
	Venue                string     `json:"venue"`
	Address              string     `json:"address"`
	City                 string     `json:"city"`
	Country              string     `json:"country"`
	Category             string     `json:"category"`
	CoverImage           string     `json:"cover_image"`
	Tags                 []string   `json:"tags"`
	Featured             bool       `json:"featured"`
	Visibility           string     `json:"visibility"`
	Capacity             *int       `json:"capacity"`
	MaxTicketsPerUser    *int       `json:"max_tickets_per_user"`
	AllowWaitlist        bool       `json:"allow_waitlist"`
	RegistrationDeadline *time.Time  `json:"registration_deadline"`
	StartTime            *time.Time  `json:"start_time"`
	EndTime              *time.Time  `json:"end_time"`
	Price                float64    `json:"price"`
}