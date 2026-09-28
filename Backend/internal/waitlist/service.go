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

// JoinWaitlist allows a normal user to join an event waitlist.
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

// PromoteNextUser promotes the first eligible person in the queue.
//
// The repository performs the capacity check and the complete promotion
// transaction atomically.
func (s *Service) PromoteNextUser(
	ctx context.Context,
	eventID int64,
) error {
	_, err := s.repo.PromoteNextUser(
		ctx,
		eventID,
	)

	return err
}

// ListOwnerWaitlist returns platform-wide waitlist data for the owner
// console.
//
// The platform-owner route is responsible for authentication and
// platform-owner authorization. This service intentionally does not
// apply organization-level membership checks because the owner needs
// visibility across the entire platform.
func (s *Service) ListOwnerWaitlist(
	ctx context.Context,
	search string,
	eventID int64,
	organizationID int64,
	sort string,
	page int,
	limit int,
) ([]OwnerWaitlistItem, int, error) {

	return s.repo.ListOwnerWaitlist(
		ctx,
		search,
		eventID,
		organizationID,
		sort,
		page,
		limit,
	)
}

// PromoteUser promotes a specific waitlist entry.
//
// The repository guarantees that only the first eligible person in the
// queue can be promoted and performs the registration + waitlist removal
// atomically.
func (s *Service) PromoteUser(
	ctx context.Context,
	waitlistID int64,
) error {

	_, err := s.repo.PromoteUser(
		ctx,
		waitlistID,
	)

	return err
}

// RemoveFromWaitlist removes a waitlist entry and re-numbers the remaining
// queue positions atomically.
func (s *Service) RemoveFromWaitlist(
	ctx context.Context,
	waitlistID int64,
) error {

	return s.repo.RemoveFromWaitlist(
		ctx,
		waitlistID,
	)
}