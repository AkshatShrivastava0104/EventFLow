package event

import (
	"context"
	"errors"
	"strings"

	"github.com/AkshatShrivastava0104/EventFlow/internal/organization"
)

type Service struct {
	repo               *Repository
	organizationService *organization.Service
}

func NewService(
	repo *Repository,
	organizationService *organization.Service,
) *Service {
	return &Service{
		repo:                repo,
		organizationService: organizationService,
	}
}

func (s *Service) CreateEvent(
	ctx context.Context,
	organizationID int64,
	userID int64,
	req CreateEventRequest,
) (int64, error) {

	// Check user's organization role
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

	// Only OWNER and ADMIN can create events
	if role != "OWNER" && role != "ADMIN" {
		return 0, errors.New(
			"you do not have permission to create events",
		)
	}

	// Validate title
	req.Title = strings.TrimSpace(req.Title)

	if req.Title == "" {
		return 0, errors.New("event title is required")
	}

	if len(req.Title) > 200 {
		return 0, errors.New(
			"event title cannot exceed 200 characters",
		)
	}

	// Validate capacity
	if req.Capacity != nil && *req.Capacity <= 0 {
		return 0, errors.New(
			"capacity must be greater than zero",
		)
	}

	// Validate event time
	if req.StartTime != nil &&
		req.EndTime != nil &&
		req.EndTime.Before(*req.StartTime) {

		return 0, errors.New(
			"end time must be after start time",
		)
	}

	event := &Event{
		OrganizationID:       organizationID,
		Title:                req.Title,
		Description:          req.Description,
		Venue:                req.Venue,
		Capacity:             req.Capacity,
		RegistrationDeadline: req.RegistrationDeadline,
		StartTime:            req.StartTime,
		EndTime:              req.EndTime,
		Status:               "draft",
	}

	return s.repo.CreateEvent(ctx, event)
}





func (s *Service) GetEvents(
	ctx context.Context,
	organizationID int64,
	userID int64,
) ([]Event, error) {

	// User must belong to organization
	_, err := s.organizationService.GetMemberRole(
		ctx,
		organizationID,
		userID,
	)

	if err != nil {
		return nil, errors.New(
			"you are not a member of this organization",
		)
	}

	return s.repo.GetEventsByOrganizationID(
		ctx,
		organizationID,
	)
}


func (s *Service) GetEventByID(
	ctx context.Context,
	eventID int64,
	userID int64,
) (*Event, error) {

	event, err := s.repo.GetEventByID(ctx, eventID)
	if err != nil {
		return nil, errors.New("event not found")
	}

	// User must belong to the event's organization
	_, err = s.organizationService.GetMemberRole(
		ctx,
		event.OrganizationID,
		userID,
	)

	if err != nil {
		return nil, errors.New("you are not a member of this organization")
	}

	return event, nil
}

func (s *Service) UpdateEvent(
	ctx context.Context,
	eventID int64,
	userID int64,
	req UpdateEventRequest,
) error {

	// Get existing event
	event, err := s.repo.GetEventByID(ctx, eventID)
	if err != nil {
		return errors.New("event not found")
	}

	// Check organization role
	role, err := s.organizationService.GetMemberRole(
		ctx,
		event.OrganizationID,
		userID,
	)

	if err != nil {
		return errors.New(
			"you are not a member of this organization",
		)
	}

	// Only OWNER / ADMIN
	if role != "OWNER" && role != "ADMIN" {
		return errors.New(
			"you do not have permission to update this event",
		)
	}

	// Don't allow editing completed/cancelled events
	if event.Status == "completed" ||
		event.Status == "cancelled" {

		return errors.New(
			"this event can no longer be updated",
		)
	}

	// Validation
	req.Title = strings.TrimSpace(req.Title)

	if req.Title == "" {
		return errors.New("event title is required")
	}

	if req.Capacity != nil && *req.Capacity <= 0 {
		return errors.New("capacity must be greater than zero")
	}

	if req.StartTime != nil &&
		req.EndTime != nil &&
		req.EndTime.Before(*req.StartTime) {

		return errors.New(
			"end time must be after start time",
		)
	}

	return s.repo.UpdateEvent(
		ctx,
		eventID,
		req,
	)
}



func (s *Service) DeleteEvent(
	ctx context.Context,
	eventID int64,
	userID int64,
) error {

	// Get event first
	event, err := s.repo.GetEventByID(ctx, eventID)
	if err != nil {
		return errors.New("event not found")
	}

	// Get user's role in the organization
	role, err := s.organizationService.GetMemberRole(
		ctx,
		event.OrganizationID,
		userID,
	)

	if err != nil {
		return errors.New(
			"you are not a member of this organization",
		)
	}

	// Only OWNER can delete
	if role != "OWNER" {
		return errors.New(
			"only owner can delete events",
		)
	}

	// Don't delete already completed events
	if event.Status == "completed" {
		return errors.New(
			"completed event cannot be deleted",
		)
	}

	return s.repo.DeleteEvent(
		ctx,
		eventID,
	)
}



func (s *Service) PublishEvent(
	ctx context.Context,
	eventID int64,
	userID int64,
) error {

	// Get event
	event, err := s.repo.GetEventByID(
		ctx,
		eventID,
	)

	if err != nil {
		return errors.New("event not found")
	}

	// Check organization role
	role, err := s.organizationService.GetMemberRole(
		ctx,
		event.OrganizationID,
		userID,
	)

	if err != nil {
		return errors.New(
			"you are not a member of this organization",
		)
	}

	// Only OWNER / ADMIN can publish
	if role != "OWNER" && role != "ADMIN" {
		return errors.New(
			"you do not have permission to publish this event",
		)
	}

	// State machine validation
	if event.Status != "draft" {
		return errors.New(
			"only draft events can be published",
		)
	}

	// Publish
	return s.repo.PublishEvent(
		ctx,
		eventID,
	)
}


func (s *Service) CancelEvent(
	ctx context.Context,
	eventID int64,
	userID int64,
) error {

	event, err := s.repo.GetEventByID(
		ctx,
		eventID,
	)

	if err != nil {
		return errors.New("event not found")
	}

	role, err := s.organizationService.GetMemberRole(
		ctx,
		event.OrganizationID,
		userID,
	)

	if err != nil {
		return errors.New(
			"you are not a member of this organization",
		)
	}

	// Only OWNER / ADMIN can cancel
	if role != "OWNER" && role != "ADMIN" {
		return errors.New(
			"you do not have permission to cancel this event",
		)
	}

	// Only draft or published events can be cancelled
	if event.Status != "draft" &&
		event.Status != "published" {

		return errors.New(
			"this event cannot be cancelled",
		)
	}

	return s.repo.CancelEvent(
		ctx,
		eventID,
	)
}



func (s *Service) GetEventForRegistration(
	ctx context.Context,
	eventID int64,
) (*Event, error) {

	return s.repo.GetEventByID(
		ctx,
		eventID,
	)
}


