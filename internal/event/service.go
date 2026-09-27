package event

import (
	"context"
	"errors"
	"strings"

	"github.com/AkshatShrivastava0104/EventFlow/internal/auditlog"
	"github.com/AkshatShrivastava0104/EventFlow/internal/organization"
	"github.com/AkshatShrivastava0104/EventFlow/internal/queue"

	apperrors "github.com/AkshatShrivastava0104/EventFlow/internal/errors"
)

type Service struct {
	repo               *Repository
	organizationService *organization.Service
	notificationQueue   *queue.NotificationQueue
	auditService       *auditlog.Service
}

func NewService(
	repo *Repository,
	organizationService *organization.Service,
	notificationQueue *queue.NotificationQueue,
	auditService *auditlog.Service,
) *Service {
	return &Service{
		repo:               repo,
		organizationService: organizationService,
		notificationQueue:   notificationQueue,
		auditService:       auditService,
	}
}


func (s *Service) CreateEvent(
	ctx context.Context,
	organizationID int64,
	userID int64,
	req CreateEventRequest,
) (int64, error) {

	role, err := s.organizationService.GetMemberRole(
		ctx,
		organizationID,
		userID,
	)

	if err != nil {
		return 0, apperrors.ErrForbidden
	}

	if role != "OWNER" && role != "ADMIN" {
		return 0, apperrors.ErrForbidden
	}

	req.Title = strings.TrimSpace(req.Title)

	if req.Title == "" {
		return 0, apperrors.ErrInvalidInput
	}

	if len(req.Title) > 200 {
		return 0, apperrors.ErrInvalidInput
	}

	if req.Capacity != nil && *req.Capacity <= 0 {
		return 0, apperrors.ErrInvalidInput
	}

	if req.StartTime != nil &&
		req.EndTime != nil &&
		req.EndTime.Before(*req.StartTime) {

		return 0, apperrors.ErrInvalidInput
	}

	eventData := &Event{
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

	eventID, err := s.repo.CreateEvent(
		ctx,
		eventData,
	)

	if err != nil {
		return 0, err
	}

	err = s.auditService.Log(
		ctx,
		&userID,
		"CREATE_EVENT",
		"event",
		eventID,
		nil,
	)

	if err != nil {
		return eventID, err
	}

	return eventID, nil
}





func (s *Service) GetEvents(
	ctx context.Context,
	organizationID int64,
	userID int64,
	page int,
	limit int,
) (*PaginatedEvents, error) {

	// User must belong to the organization.
	_, err := s.organizationService.GetMemberRole(
		ctx,
		organizationID,
		userID,
	)

	if err != nil {
		return nil, apperrors.ErrForbidden
	}

	events, total, err := s.repo.GetEventsByOrganizationID(
		ctx,
		organizationID,
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

	return &PaginatedEvents{
		Events: events,
		Pagination: Pagination{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: totalPages,
		},
	}, nil
}


func (s *Service) GetEventByID(
	ctx context.Context,
	eventID int64,
	userID int64,
) (*Event, error) {

	event, err := s.repo.GetEventByID(
		ctx,
		eventID,
	)
	if err != nil {
		return nil, errors.New("event not found")
	}

	// Published events are discoverable by authenticated users.
	if event.Status == "published" {
		return event, nil
	}

	// Draft/cancelled/completed events remain organization-scoped.
	_, err = s.organizationService.GetMemberRole(
		ctx,
		event.OrganizationID,
		userID,
	)

	if err != nil {
		return nil, errors.New(
			"you are not a member of this organization",
		)
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
	eventData, err := s.repo.GetEventByID(
		ctx,
		eventID,
	)
	if err != nil {
		return apperrors.ErrEventNotFound
	}

	// Check user's organization role
	role, err := s.organizationService.GetMemberRole(
		ctx,
		eventData.OrganizationID,
		userID,
	)
	if err != nil {
		return apperrors.ErrForbidden
	}

	// Only OWNER / ADMIN can update events
	if role != "OWNER" && role != "ADMIN" {
		return apperrors.ErrForbidden
	}

	// Completed and cancelled events cannot be edited
	if eventData.Status == "completed" ||
		eventData.Status == "cancelled" {

		return apperrors.ErrInvalidInput
	}

	// Validate title
	req.Title = strings.TrimSpace(req.Title)

	if req.Title == "" {
		return apperrors.ErrInvalidInput
	}

	if len(req.Title) > 200 {
		return apperrors.ErrInvalidInput
	}

	// Validate capacity
	if req.Capacity != nil && *req.Capacity <= 0 {
		return apperrors.ErrInvalidInput
	}

	// Validate event time
	if req.StartTime != nil &&
		req.EndTime != nil &&
		req.EndTime.Before(*req.StartTime) {

		return apperrors.ErrInvalidInput
	}

	// Update event
	err = s.repo.UpdateEvent(
		ctx,
		eventID,
		req,
	)
	if err != nil {
		return err
	}

	// Audit log
	err = s.auditService.Log(
		ctx,
		&userID,
		"UPDATE_EVENT",
		"event",
		eventID,
		nil,
	)

	if err != nil {
		return err
	}

	return nil
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

	eventData, err := s.repo.GetEventByID(
		ctx,
		eventID,
	)

	if err != nil {
		return apperrors.ErrEventNotFound
	}

	role, err := s.organizationService.GetMemberRole(
		ctx,
		eventData.OrganizationID,
		userID,
	)

	if err != nil {
		return apperrors.ErrForbidden
	}

	if role != "OWNER" && role != "ADMIN" {
		return apperrors.ErrForbidden
	}

	if eventData.Status != "draft" {
		return apperrors.ErrInvalidInput
	}

	err = s.repo.PublishEvent(
		ctx,
		eventID,
	)

	if err != nil {
		return err
	}

	err = s.auditService.Log(
		ctx,
		&userID,
		"PUBLISH_EVENT",
		"event",
		eventID,
		nil,
	)

	if err != nil {
		return err
	}

	return nil
}




func (s *Service) CancelEvent(
	ctx context.Context,
	eventID int64,
	userID int64,
) error {

	eventData, err := s.repo.GetEventByID(
		ctx,
		eventID,
	)

	if err != nil {
		return apperrors.ErrEventNotFound
	}

	role, err := s.organizationService.GetMemberRole(
		ctx,
		eventData.OrganizationID,
		userID,
	)

	if err != nil {
		return apperrors.ErrForbidden
	}

	if role != "OWNER" && role != "ADMIN" {
		return apperrors.ErrForbidden
	}

	if eventData.Status != "draft" &&
		eventData.Status != "published" {

		return apperrors.ErrInvalidInput
	}

	// Cancel event + create outbox notifications
	// inside one DB transaction.
	err = s.repo.CancelEvent(
		ctx,
		eventID,
	)

	if err != nil {
		return err
	}

	// Audit log.
	err = s.auditService.Log(
		ctx,
		&userID,
		"CANCEL_EVENT",
		"event",
		eventID,
		nil,
	)

	if err != nil {
		return err
	}

	return nil
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



func (s *Service) GetEventOrganizationID(
	ctx context.Context,
	eventID int64,
) (int64, error) {

	eventData, err := s.repo.GetEventByID(
		ctx,
		eventID,
	)

	if err != nil {
		return 0, err
	}

	return eventData.OrganizationID, nil
}





func (s *Service) CompleteEvent(
	ctx context.Context,
	eventID int64,
	userID int64,
) error {

	eventData, err := s.repo.GetEventByID(
		ctx,
		eventID,
	)

	if err != nil {
		return apperrors.ErrEventNotFound
	}

	role, err := s.organizationService.GetMemberRole(
		ctx,
		eventData.OrganizationID,
		userID,
	)

	if err != nil {
		return apperrors.ErrForbidden
	}

	if role != "OWNER" && role != "ADMIN" {
		return apperrors.ErrForbidden
	}

	if eventData.Status != "published" {
		return apperrors.ErrInvalidInput
	}

	err = s.repo.CompleteEvent(
		ctx,
		eventID,
	)

	if err != nil {
		return err
	}

	err = s.auditService.Log(
		ctx,
		&userID,
		"COMPLETE_EVENT",
		"event",
		eventID,
		nil,
	)

	if err != nil {
		return err
	}

	return nil
}


func (s *Service) GetAllEvents(
	ctx context.Context,
	page int,
	limit int,
	status string,
	order string,
) (*PaginatedEvents, error) {

	events, total, err := s.repo.GetAllEvents(
		ctx,
		page,
		limit,
		status,
		order,
	)

	if err != nil {
		return nil, err
	}

	totalPages := 0

	if total > 0 {
		totalPages = (total + limit - 1) / limit
	}

	return &PaginatedEvents{
		Events: events,
		Pagination: Pagination{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: totalPages,
		},
	}, nil
}

