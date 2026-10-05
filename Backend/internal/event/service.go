package event

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/AkshatShrivastava0104/EventFlow/internal/auditlog"
	apperrors "github.com/AkshatShrivastava0104/EventFlow/internal/errors"
	"github.com/AkshatShrivastava0104/EventFlow/internal/organization"
	"github.com/AkshatShrivastava0104/EventFlow/internal/queue"
)

type Service struct {
	repo                *Repository
	organizationService *organization.Service
	notificationQueue   *queue.NotificationQueue
	auditService        *auditlog.Service
}

func NewService(
	repo *Repository,
	organizationService *organization.Service,
	notificationQueue *queue.NotificationQueue,
	auditService *auditlog.Service,
) *Service {
	return &Service{
		repo:                repo,
		organizationService: organizationService,
		notificationQueue:   notificationQueue,
		auditService:        auditService,
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

	if role != "ADMIN" {
		return 0, apperrors.ErrForbidden
	}

	req.Title = strings.TrimSpace(req.Title)
	req.Slug = strings.TrimSpace(req.Slug)
	req.Venue = strings.TrimSpace(req.Venue)
	req.Address = strings.TrimSpace(req.Address)
	req.City = strings.TrimSpace(req.City)
	req.Country = strings.TrimSpace(req.Country)
	req.Category = strings.TrimSpace(req.Category)
	req.CoverImage = strings.TrimSpace(req.CoverImage)
	req.Visibility = strings.TrimSpace(
		strings.ToLower(req.Visibility),
	)

	if req.Title == "" {
		return 0, apperrors.ErrInvalidInput
	}

	if len(req.Title) > 200 {
		return 0, apperrors.ErrInvalidInput
	}

	if req.Capacity != nil && *req.Capacity <= 0 {
		return 0, apperrors.ErrInvalidInput
	}

	if req.MaxTicketsPerUser != nil &&
		*req.MaxTicketsPerUser <= 0 {
		return 0, apperrors.ErrInvalidInput
	}

	if req.Price < 0 {
		return 0, apperrors.ErrInvalidInput
	}

	if req.StartTime != nil &&
		req.EndTime != nil &&
		req.EndTime.Before(*req.StartTime) {
		return 0, apperrors.ErrInvalidInput
	}

	if req.RegistrationDeadline != nil &&
		req.StartTime != nil &&
		req.RegistrationDeadline.After(*req.StartTime) {
		return 0, apperrors.ErrInvalidInput
	}

	if req.Visibility == "" {
		req.Visibility = "public"
	}

	if req.Visibility != "public" &&
		req.Visibility != "private" {
		return 0, apperrors.ErrInvalidInput
	}

	eventData := &Event{
		OrganizationID:       organizationID,
		Title:                req.Title,
		Slug:                 req.Slug,
		Description:          req.Description,
		Venue:                req.Venue,
		Address:              req.Address,
		City:                 req.City,
		Country:              req.Country,
		Category:             req.Category,
		CoverImage:           req.CoverImage,
		Tags:                 req.Tags,
		Featured:             req.Featured,
		Visibility:           req.Visibility,
		Capacity:             req.Capacity,
		MaxTicketsPerUser:    req.MaxTicketsPerUser,
		AllowWaitlist:        req.AllowWaitlist,
		RegistrationDeadline: req.RegistrationDeadline,
		StartTime:            req.StartTime,
		EndTime:              req.EndTime,
		Price:                req.Price,
		Status:               "draft",
	}

	eventID, err := s.repo.CreateEvent(
		ctx,
		eventData,
	)
	if err != nil {
		return 0, err
	}

	if err := s.auditService.Log(
		ctx,
		&userID,
		"CREATE_EVENT",
		"event",
		eventID,
		nil,
	); err != nil {
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
	eventData, err := s.repo.GetEventByID(
		ctx,
		eventID,
	)
	if err != nil {
		return nil, errors.New("event not found")
	}

	if eventData.Status == "published" {
		return eventData, nil
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

	return eventData, nil
}

func (s *Service) UpdateEvent(
	ctx context.Context,
	eventID int64,
	userID int64,
	req UpdateEventRequest,
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

	if role != "ADMIN" {
		return apperrors.ErrForbidden
	}

	if eventData.Status == "completed" ||
		eventData.Status == "cancelled" {
		return apperrors.ErrInvalidInput
	}

	req.Title = strings.TrimSpace(req.Title)
	req.Slug = strings.TrimSpace(req.Slug)
	req.Venue = strings.TrimSpace(req.Venue)
	req.Address = strings.TrimSpace(req.Address)
	req.City = strings.TrimSpace(req.City)
	req.Country = strings.TrimSpace(req.Country)
	req.Category = strings.TrimSpace(req.Category)
	req.CoverImage = strings.TrimSpace(req.CoverImage)
	req.Visibility = strings.TrimSpace(
		strings.ToLower(req.Visibility),
	)

	if req.Title == "" {
		return apperrors.ErrInvalidInput
	}

	if len(req.Title) > 200 {
		return apperrors.ErrInvalidInput
	}

	if req.Capacity != nil && *req.Capacity <= 0 {
		return apperrors.ErrInvalidInput
	}

	if req.MaxTicketsPerUser != nil &&
		*req.MaxTicketsPerUser <= 0 {
		return apperrors.ErrInvalidInput
	}

	if req.Price < 0 {
		return apperrors.ErrInvalidInput
	}

	if req.StartTime != nil &&
		req.EndTime != nil &&
		req.EndTime.Before(*req.StartTime) {
		return apperrors.ErrInvalidInput
	}

	if req.RegistrationDeadline != nil &&
		req.StartTime != nil &&
		req.RegistrationDeadline.After(*req.StartTime) {
		return apperrors.ErrInvalidInput
	}

	if req.Visibility == "" {
		req.Visibility = "public"
	}

	if req.Visibility != "public" &&
		req.Visibility != "private" {
		return apperrors.ErrInvalidInput
	}

	if err := s.repo.UpdateEvent(
		ctx,
		eventID,
		req,
	); err != nil {
		return err
	}

	if err := s.auditService.Log(
		ctx,
		&userID,
		"UPDATE_EVENT",
		"event",
		eventID,
		nil,
	); err != nil {
		return err
	}

	return nil
}

// UploadEventMedia stores the uploaded media URL against the event.
func (s *Service) UploadEventMedia(
	ctx context.Context,
	eventID int64,
	userID int64,
	mediaURL string,
) error {
	mediaURL = strings.TrimSpace(mediaURL)

	if mediaURL == "" {
		return apperrors.ErrInvalidInput
	}

	if err := s.ValidateEventMediaUpload(ctx, eventID, userID); err != nil {
		return err
	}

	if err := s.repo.UpdateCoverImage(
		ctx,
		eventID,
		mediaURL,
	); err != nil {
		return err
	}

	if err := s.auditService.Log(
		ctx,
		&userID,
		"UPLOAD_EVENT_MEDIA",
		"event",
		eventID,
		nil,
	); err != nil {
		return fmt.Errorf("%w: %w", ErrEventMediaAuditFailed, err)
	}

	return nil
}

func (s *Service) ValidateEventMediaUpload(
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

	if role != "ADMIN" {
		return apperrors.ErrForbidden
	}

	if eventData.Status == "completed" ||
		eventData.Status == "cancelled" {
		return apperrors.ErrInvalidInput
	}

	return nil
}

func (s *Service) DeleteEvent(
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

	if role != "ADMIN" {
		return apperrors.ErrForbidden
	}

	if eventData.Status == "completed" {
		return apperrors.ErrInvalidInput
	}

	if err := s.repo.DeleteEvent(
		ctx,
		eventID,
	); err != nil {
		return err
	}

	if err := s.auditService.Log(
		ctx,
		&userID,
		"DELETE_EVENT",
		"event",
		eventID,
		nil,
	); err != nil {
		return err
	}

	return nil
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

	if role != "ADMIN" {
		return apperrors.ErrForbidden
	}

	if eventData.Status != "draft" {
		return apperrors.ErrInvalidInput
	}

	if err := s.repo.PublishEvent(
		ctx,
		eventID,
	); err != nil {
		return err
	}

	if err := s.auditService.Log(
		ctx,
		&userID,
		"PUBLISH_EVENT",
		"event",
		eventID,
		nil,
	); err != nil {
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

	if role != "ADMIN" {
		return apperrors.ErrForbidden
	}

	if eventData.Status != "draft" &&
		eventData.Status != "published" {
		return apperrors.ErrInvalidInput
	}

	if err := s.repo.CancelEvent(
		ctx,
		eventID,
	); err != nil {
		return err
	}

	if err := s.auditService.Log(
		ctx,
		&userID,
		"CANCEL_EVENT",
		"event",
		eventID,
		nil,
	); err != nil {
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

	if role != "ADMIN" {
		return apperrors.ErrForbidden
	}

	if eventData.Status != "published" {
		return apperrors.ErrInvalidInput
	}

	if err := s.repo.CompleteEvent(
		ctx,
		eventID,
	); err != nil {
		return err
	}

	if err := s.auditService.Log(
		ctx,
		&userID,
		"COMPLETE_EVENT",
		"event",
		eventID,
		nil,
	); err != nil {
		return err
	}

	return nil
}

/*
GetAllEvents returns published/discoverable events with
server-side filtering.

Filters:
- search
- category
- city
- price
- sort

Sort values:
- soonest
- price-asc
- price-desc
- popular
*/
func (s *Service) GetAllEvents(
	ctx context.Context,
	page int,
	limit int,
	status string,
	order string,
	search string,
	category string,
	city string,
	price string,
	sort string,
) (*PaginatedEvents, error) {
	search = strings.TrimSpace(search)
	category = strings.TrimSpace(category)
	city = strings.TrimSpace(city)
	price = strings.TrimSpace(
		strings.ToLower(price),
	)
	sort = strings.TrimSpace(
		strings.ToLower(sort),
	)

	events, total, err := s.repo.GetAllEvents(
		ctx,
		page,
		limit,
		status,
		order,
		search,
		category,
		city,
		price,
		sort,
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
