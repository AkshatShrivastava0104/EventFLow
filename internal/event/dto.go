package event

import "time"

type CreateEventRequest struct {
	Title                string     `json:"title" binding:"required"`
	Description          string     `json:"description"`
	Venue                string     `json:"venue"`
	Capacity             *int       `json:"capacity"`
	RegistrationDeadline *time.Time `json:"registration_deadline"`
	StartTime            *time.Time `json:"start_time"`
	EndTime              *time.Time `json:"end_time"`
}

type UpdateEventRequest struct {
	Title                string     `json:"title"`
	Description          string     `json:"description"`
	Venue                string     `json:"venue"`
	Capacity             *int       `json:"capacity"`
	RegistrationDeadline *time.Time `json:"registration_deadline"`
	StartTime            *time.Time `json:"start_time"`
	EndTime              *time.Time `json:"end_time"`
}