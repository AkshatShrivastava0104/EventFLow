package ticket

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/AkshatShrivastava0104/EventFlow/internal/registration"
)

type Service struct {
	repo               *Repository
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

func (s *Service) CreateTicket(
	ctx context.Context,
	registrationID int64,
	userID int64,
) (int64, error) {

	// Get user's registrations.
	registrations, err := s.registrationService.GetMyRegistrations(
		ctx,
		userID,
	)

	if err != nil {
		return 0, err
	}

	var registrationExists bool
	var registrationStatus string

	for _, r := range registrations {
		if r.ID == registrationID {
			registrationExists = true
			registrationStatus = r.Status
			break
		}
	}

	if !registrationExists {
		return 0, errors.New("registration not found")
	}

	if registrationStatus == "cancelled" {
		return 0, errors.New(
			"cancelled registration cannot have a ticket",
		)
	}

	// Generate unique ticket number.
	ticketNumber, err := generateTicketNumber()
	if err != nil {
		return 0, err
	}

	// QR code data.
	// Later we can convert this data into an actual QR image.
	qrCode := fmt.Sprintf(
		"eventflow:ticket:%d",
		registrationID,
	)

	return s.repo.CreateTicket(
		ctx,
		registrationID,
		ticketNumber,
		qrCode,
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