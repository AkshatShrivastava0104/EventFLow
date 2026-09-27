package waitlist

import (
	"context"

	apperrors "github.com/AkshatShrivastava0104/EventFlow/internal/errors"
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

	_, err := s.eventService.GetEventForRegistration(
		ctx,
		eventID,
	)

	if err != nil {
		return 0, apperrors.ErrEventNotFound
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

	_, err := s.repo.PromoteNextUser(
		ctx,
		eventID,
	)

	if err != nil {
		return err
	}

	return nil
}