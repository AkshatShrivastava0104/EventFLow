package registration

import (
	"context"
	"errors"

	"github.com/AkshatShrivastava0104/EventFlow/internal/event"
	"github.com/AkshatShrivastava0104/EventFlow/internal/organization"
	"github.com/AkshatShrivastava0104/EventFlow/internal/waitlist"
)

type Service struct {
	repo                *Repository
	eventService        *event.Service
	organizationService *organization.Service
	waitlistService     *waitlist.Service
}

func NewService(
	repo *Repository,
	eventService *event.Service,
	organizationService *organization.Service,
	waitlistService *waitlist.Service,
) *Service {
	return &Service{
		repo:                repo,
		eventService:        eventService,
		organizationService: organizationService,
		waitlistService:     waitlistService,
	}
}

func (s *Service) Register(
	ctx context.Context,
	eventID int64,
	userID int64,
) (int64, error) {

	// Get event
	event, err := s.eventService.GetEventForRegistration(
		ctx,
		eventID,
	)

	if err != nil {
		return 0, errors.New("event not found")
	}

	// User must belong to event's organization
	_, err = s.organizationService.GetMemberRole(
		ctx,
		event.OrganizationID,
		userID,
	)

	if err != nil {
		return 0, errors.New(
			"you are not a member of this organization",
		)
	}

	// Repository handles transaction,
	// capacity and duplicate protection.
	return s.repo.RegisterUser(
		ctx,
		eventID,
		userID,
	)
}


func (s *Service) GetMyRegistrations(
	ctx context.Context,
	userID int64,
) ([]Registration, error) {

	return s.repo.GetRegistrationsByUserID(
		ctx,
		userID,
	)
}


func (s *Service) CancelRegistration(
	ctx context.Context,
	registrationID int64,
	userID int64,
) error {

	eventID, err := s.repo.CancelRegistration(
		ctx,
		registrationID,
		userID,
	)

	if err != nil {
		return err
	}

	// Try to promote the next person.
	return s.waitlistService.PromoteNextUser(
		ctx,
		eventID,
	)
}