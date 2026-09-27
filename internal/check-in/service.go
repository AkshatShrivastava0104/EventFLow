package checkin

import (
	"context"

	apperrors "github.com/AkshatShrivastava0104/EventFlow/internal/errors"
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
		return 0, apperrors.ErrEventNotFound
	}

	role, err := s.organizationService.GetMemberRole(
		ctx,
		organizationID,
		userID,
	)

	if err != nil {
		return 0, apperrors.ErrForbidden
	}

	if role != "OWNER" &&
		role != "ADMIN" &&
		role != "VOLUNTEER" {

		return 0, apperrors.ErrForbidden
	}

	return s.repo.CheckIn(
		ctx,
		eventID,
		ticketNumber,
		&userID,
	)
}