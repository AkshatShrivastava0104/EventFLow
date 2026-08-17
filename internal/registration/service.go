package registration

import (
	"context"
	"errors"

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

	result, err := s.repo.RegisterUser(
		ctx,
		eventID,
		userID,
	)
	if err != nil {
		return nil, err
	}

	// Registration succeeded
	if result.Status == "registered" {
		err := s.notificationQueue.Enqueue(
			ctx,
			queue.NotificationJob{
				UserID: userID,
				Type:   "REGISTRATION_CREATED",
				Message: "Your registration was created successfully.",
			},
		)
		if err != nil {
			// Registration is already committed.
			// Log/handle queue failure separately.
			return result, err
		}
	}

	// User was added to waitlist
	if result.Status == "waitlisted" {
		err := s.notificationQueue.Enqueue(
			ctx,
			queue.NotificationJob{
				UserID: userID,
				Type:   "WAITLISTED",
				Message: "The event is full. You have been added to the waitlist.",
			},
		)
		if err != nil {
			return result, err
		}
	}

	return result, nil
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