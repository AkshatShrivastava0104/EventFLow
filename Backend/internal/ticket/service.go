package ticket

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	apperrors "github.com/AkshatShrivastava0104/EventFlow/internal/errors"
	"github.com/AkshatShrivastava0104/EventFlow/internal/registration"
)

type Service struct {
	repo                *Repository
	registrationService *registration.Service
}

func NewService(
	repo *Repository,
	registrationService *registration.Service,
) *Service {
	return &Service{
		repo:                repo,
		registrationService: registrationService,
	}
}

// CreateTicket creates exactly one ticket for an active registration.
//
// Ticket creation is intentionally idempotency-safe at the repository layer:
// if a ticket already exists for the registration, the repository returns
// ErrConflict instead of creating a duplicate ticket.
func (s *Service) CreateTicket(
	ctx context.Context,
	registrationID int64,
	userID int64,
) (int64, error) {

	registrations, err := s.registrationService.GetMyRegistrations(
		ctx,
		userID,
		1,
		100,
	)
	if err != nil {
		return 0, err
	}

	var registrationFound bool
	var registrationStatus string

	for _, item := range registrations.Registrations {
		if item.ID != registrationID {
			continue
		}

		registrationFound = true
		registrationStatus = item.Status
		break
	}

	if !registrationFound {
		return 0, apperrors.ErrRegistrationNotFound
	}

	if registrationStatus == "cancelled" {
		return 0, apperrors.ErrInvalidInput
	}

	ticketNumber, err := generateTicketNumber()
	if err != nil {
		return 0, err
	}

	checkInToken, err := generateCheckInToken()
	if err != nil {
		return 0, err
	}

	ticketID, err := s.repo.CreateTicket(
		ctx,
		registrationID,
		ticketNumber,
		checkInToken,
		userID,
	)
	if err != nil {
		return 0, err
	}

	return ticketID, nil
}

// GetMyTickets returns only currently valid tickets.
// Cancelled registrations are filtered by the ticket repository.
func (s *Service) GetMyTickets(
	ctx context.Context,
	userID int64,
) ([]MyTicket, error) {
	return s.repo.GetMyTickets(ctx, userID)
}

// GetTicketByID returns one valid ticket belonging to the authenticated user.
func (s *Service) GetTicketByID(
	ctx context.Context,
	ticketID int64,
	userID int64,
) (*MyTicket, error) {

	if ticketID <= 0 {
		return nil, apperrors.ErrTicketNotFound
	}

	if userID <= 0 {
		return nil, apperrors.ErrForbidden
	}

	return s.repo.GetTicketByID(
		ctx,
		ticketID,
		userID,
	)
}

func generateTicketNumber() (string, error) {
	b := make([]byte, 8)

	if _, err := rand.Read(b); err != nil {
		return "", err
	}

	return fmt.Sprintf(
		"EVT-%d-%s",
		time.Now().Unix(),
		hex.EncodeToString(b),
	), nil
}

func generateCheckInToken() (string, error) {
	b := make([]byte, 32)

	if _, err := rand.Read(b); err != nil {
		return "", err
	}

	return hex.EncodeToString(b), nil
}