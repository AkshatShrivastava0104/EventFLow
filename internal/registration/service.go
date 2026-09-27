package registration

import (
	"context"

	apperrors "github.com/AkshatShrivastava0104/EventFlow/internal/errors"
	"github.com/AkshatShrivastava0104/EventFlow/internal/event"
	"github.com/AkshatShrivastava0104/EventFlow/internal/organization"
	"github.com/AkshatShrivastava0104/EventFlow/internal/queue"
	"github.com/AkshatShrivastava0104/EventFlow/internal/waitlist"
)

type Service struct {
	repo                *Repository
	eventService        *event.Service
	organizationService *organization.Service
	waitlistService     *waitlist.Service
	notificationQueue    *queue.NotificationQueue
}

func NewService(
	repo *Repository,
	eventService *event.Service,
	organizationService *organization.Service,
	waitlistService *waitlist.Service,
	notificationQueue *queue.NotificationQueue,
) *Service {
	return &Service{
		repo:                repo,
		eventService:        eventService,
		organizationService: organizationService,
		waitlistService:     waitlistService,
		notificationQueue:   notificationQueue,
	}
}

func (s *Service) Register(
	ctx context.Context,
	eventID int64,
	userID int64,
) (*RegisterResult, error) {

	_, err := s.eventService.GetEventForRegistration(
		ctx,
		eventID,
	)

	if err != nil {
		return nil, err
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
	page int,
	limit int,
) (*PaginatedRegistrations, error) {

	registrations, total, err := s.repo.GetRegistrationsByUserID(
		ctx,
		userID,
		page,
		limit,
	)

	if err != nil {
		return nil, err
	}

	totalPages := 0

	if total > 0 {
		totalPages = (total + limit - 1) / limit
	}

	return &PaginatedRegistrations{
		Registrations: registrations,
		Pagination: Pagination{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: totalPages,
		},
	}, nil
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
		return apperrors.ErrRegistrationNotFound
	}

	// Automatically promote first waitlisted user.
	return s.waitlistService.PromoteNextUser(
		ctx,
		eventID,
	)
}




func (s *Service) GetEventRegistrations(
	ctx context.Context,
	eventID int64,
	userID int64,
	page int,
	limit int,
) (*PaginatedAttendees, error) {

	eventData, err := s.eventService.GetEventForRegistration(
		ctx,
		eventID,
	)

	if err != nil {
		return nil, apperrors.ErrEventNotFound
	}

	role, err := s.organizationService.GetMemberRole(
		ctx,
		eventData.OrganizationID,
		userID,
	)

	if err != nil {
		return nil, apperrors.ErrForbidden
	}

	if role != "OWNER" && role != "ADMIN" {
		return nil, apperrors.ErrForbidden
	}

	attendees, total, err := s.repo.GetEventRegistrations(
		ctx,
		eventID,
		page,
		limit,
	)

	if err != nil {
		return nil, err
	}

	totalPages := 0

	if total > 0 {
		totalPages = (total + limit - 1) / limit
	}

	return &PaginatedAttendees{
		Attendees: attendees,
		Pagination: Pagination{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: totalPages,
		},
	}, nil
}