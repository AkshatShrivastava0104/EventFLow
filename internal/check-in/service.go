package checkin

import (
	"context"
	"errors"

	"github.com/AkshatShrivastava0104/EventFlow/internal/event"
	"github.com/AkshatShrivastava0104/EventFlow/internal/organization"
)



type Service struct {
	repo                 *Repository
	eventService         *event.Service
	organizationService  *organization.Service
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

func (s *Service) CheckIn(
	ctx context.Context,
	eventID int64,
	ticketNumber string,
	userID int64,
) (int64, error) {

	organizationID, err := s.eventService.GetEventOrganizationID(
		ctx,
		eventID,
	)

	if err != nil {
		return 0, errors.New("event not found")
	}

	role, err := s.organizationService.GetMemberRole(
		ctx,
		organizationID,
		userID,
	)

	if err != nil {
		return 0, errors.New(
			"you are not a member of this organization",
		)
	}

	if role != "OWNER" &&
		role != "ADMIN" &&
		role != "VOLUNTEER" {

		return 0, errors.New(
			"you do not have permission to check in attendees",
		)
	}

	return s.repo.CheckIn(
		ctx,
		eventID,
		ticketNumber,
		&userID,
	)
}