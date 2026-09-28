package admin

import (
	"context"
	"time"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{
		repo: repo,
	}
}

// GetStats returns platform-wide aggregate metrics.
func (s *Service) GetStats(ctx context.Context) (*PlatformStats, error) {
	return s.repo.GetStats(ctx)
}

func normalizePaging(page, limit int) (int, int, int) {
	if page < 1 {
		page = 1
	}

	if limit < 1 {
		limit = 20
	}

	if limit > 100 {
		limit = 100
	}

	offset := (page - 1) * limit

	return page, limit, offset
}

func buildPagination(page, limit, total int) Pagination {
	totalPages := 0

	if limit > 0 {
		totalPages = (total + limit - 1) / limit
	}

	return Pagination{
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: totalPages,
	}
}

// ListOrganizations returns a paginated view of every organization.
func (s *Service) ListOrganizations(
	ctx context.Context,
	search string,
	page, limit int,
) (*PaginatedOrganizations, error) {
	page, limit, offset := normalizePaging(page, limit)

	orgs, total, err := s.repo.ListOrganizations(
		ctx,
		search,
		limit,
		offset,
	)
	if err != nil {
		return nil, err
	}

	return &PaginatedOrganizations{
		Organizations: orgs,
		Pagination:    buildPagination(page, limit, total),
	}, nil
}

// ListUsers returns a paginated view of every user.
func (s *Service) ListUsers(
	ctx context.Context,
	search string,
	page, limit int,
) (*PaginatedUsers, error) {
	page, limit, offset := normalizePaging(page, limit)

	users, total, err := s.repo.ListUsers(
		ctx,
		search,
		limit,
		offset,
	)
	if err != nil {
		return nil, err
	}

	return &PaginatedUsers{
		Users:      users,
		Pagination: buildPagination(page, limit, total),
	}, nil
}

// ListRegistrations returns a platform-wide, read-only view of registrations.
func (s *Service) ListRegistrations(
	ctx context.Context,
	search string,
	eventID int64,
	organizationID int64,
	registrationStatus string,
	paymentStatus string,
	checkinStatus string,
	from *time.Time,
	to *time.Time,
	sort string,
	page, limit int,
) (*PaginatedRegistrations, error) {
	page, limit, offset := normalizePaging(page, limit)

	registrations, total, err := s.repo.ListRegistrations(
		ctx,
		search,
		eventID,
		organizationID,
		registrationStatus,
		paymentStatus,
		checkinStatus,
		from,
		to,
		sort,
		limit,
		offset,
	)
	if err != nil {
		return nil, err
	}

	return &PaginatedRegistrations{
		Registrations: registrations,
		Pagination:    buildPagination(page, limit, total),
	}, nil
}