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
	repo                 *Repository
	registrationService  *registration.Service
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

	for _, registration := range registrations.Registrations {

		if registration.ID == registrationID {
			registrationFound = true
			registrationStatus = registration.Status
			break
		}
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

	qrCode := fmt.Sprintf(
		"eventflow:ticket:%d",
		registrationID,
	)

	ticketID, err := s.repo.CreateTicket(
		ctx,
		registrationID,
		ticketNumber,
		qrCode,
		userID,
	)

	if err != nil {
		return 0, err
	}

	return ticketID, nil
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