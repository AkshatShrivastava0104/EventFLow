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
) (*RegisterResult, error) {

	eventData, err := s.eventService.GetEventForRegistration(
		ctx,
		eventID,
	)

	if err != nil {
		return nil, errors.New("event not found")
	}

	_, err = s.organizationService.GetMemberRole(
		ctx,
		eventData.OrganizationID,
		userID,
	)

	if err != nil {
		return nil, errors.New(
			"you are not a member of this organization",
		)
	}

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

	// Try to promote the next person from this event's waitlist.
	return s.waitlistService.PromoteNextUser(
		ctx,
		eventID,
	)
}