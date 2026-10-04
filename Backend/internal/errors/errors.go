package errors

import "errors"

var (
	ErrNotFound     = errors.New("resource not found")
	ErrUnauthorized = errors.New("unauthorized")
	ErrForbidden    = errors.New("forbidden")
	ErrConflict     = errors.New("conflict")
	ErrInvalidInput = errors.New("invalid input")

	ErrEventNotFound              = errors.New("event not found")
	ErrRegistrationNotFound       = errors.New("registration not found")
	ErrOrganizationNotFound       = errors.New("organization not found")
	ErrUserNotFound               = errors.New("user not found")
	ErrTicketNotFound             = errors.New("ticket not found")
	ErrAlreadyRegistered          = errors.New("user already registered")
	ErrAlreadyWaitlisted          = errors.New("user already on waitlist")
	ErrRegistrationDeadlinePassed = errors.New("registration deadline has passed")
	ErrEventNotPublished          = errors.New("registrations are only allowed for published events")
	ErrEventFull                  = errors.New("event is full")
	ErrPaymentRequired            = errors.New("a successful payment is required")
)
