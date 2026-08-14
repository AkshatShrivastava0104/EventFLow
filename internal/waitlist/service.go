package waitlist

import (
	"context"
	"errors"

	"github.com/AkshatShrivastava0104/EventFlow/internal/event"
	"github.com/AkshatShrivastava0104/EventFlow/internal/organization"
)

type Service struct {
	repo                *Repository
	eventService        *event.Service
	organizationService *organization.Service
}

func NewService(
	repo *Repository,
	eventService *event.Service,
	organizationService *organization.Service,
) *Service {
	return &Service{
		repo:                repo,
		eventService:        eventService,
		organizationService: organizationService,
	}
}

func (s *Service) JoinWaitlist(
	ctx context.Context,
	eventID int64,
	userID int64,
) (int64, error) {

	eventData, err := s.eventService.GetEventForRegistration(
		ctx,
		eventID,
	)

	if err != nil {
		return 0, errors.New("event not found")
	}

	// Keep the same organization membership rule
	// we're currently using for registrations.
	_, err = s.organizationService.GetMemberRole(
		ctx,
		eventData.OrganizationID,
		userID,
	)

	if err != nil {
		return 0, errors.New(
			"you are not a member of this organization",
		)
	}

	return s.repo.AddToWaitlist(
		ctx,
		eventID,
		userID,
	)
}


func (s *Service) PromoteNextUser(
	ctx context.Context,
	eventID int64,
) error {

	return s.repo.PromoteNextUser(
		ctx,
		eventID,
	)
}