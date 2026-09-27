package stats

import (
	"context"
	"errors"
	"strings"
)

var (
	ErrForbidden      = errors.New("forbidden")
	ErrOrganizationID = errors.New("organization id is required")
	ErrInvalidRange   = errors.New("invalid analytics range")
)

type AnalyticsRange string

const (
	Range7Days   AnalyticsRange = "7d"
	Range30Days  AnalyticsRange = "30d"
	Range90Days  AnalyticsRange = "90d"
	Range12Months AnalyticsRange = "12m"
)

type OrganizationRoleGetter interface {
	GetMemberRole(
		ctx context.Context,
		organizationID int64,
		userID int64,
	) (string, error)
}

type Service struct {
	repo         *Repository
	organization OrganizationRoleGetter
}

func NewService(
	repo *Repository,
	organization OrganizationRoleGetter,
) *Service {
	return &Service{
		repo:         repo,
		organization: organization,
	}
}

// GetPlatformStats returns platform-wide statistics.
// Only PLATFORM_OWNER can access this endpoint.
func (s *Service) GetPlatformStats(
	ctx context.Context,
	userID int64,
	platformRole string,
) (*PlatformStats, error) {

	if !isPlatformOwner(platformRole) {
		return nil, ErrForbidden
	}

	return s.repo.GetPlatformStats(ctx)
}

// GetOrganizationStats returns organization-level statistics.
//
// ADMIN and STAFF can access statistics for organizations
// they belong to.
//
// The range controls the analytics period:
//   - 7d  = last 7 days
//   - 30d = last 30 days
//   - 90d = last 90 days
//   - 12m = last 12 months
func (s *Service) GetOrganizationStats(
	ctx context.Context,
	organizationID int64,
	userID int64,
	analyticsRange string,
) (*OrganizationStats, error) {

	if organizationID <= 0 {
		return nil, ErrOrganizationID
	}

	role, err := s.organization.GetMemberRole(
		ctx,
		organizationID,
		userID,
	)
	if err != nil {
		return nil, ErrForbidden
	}

	role = strings.ToUpper(strings.TrimSpace(role))

	if role != "ADMIN" && role != "STAFF" {
		return nil, ErrForbidden
	}

	normalizedRange, err := normalizeAnalyticsRange(
		analyticsRange,
	)
	if err != nil {
		return nil, err
	}

	return s.repo.GetOrganizationStats(
		ctx,
		organizationID,
		string(normalizedRange),
	)
}

// GetStaffStats returns operational statistics for staff/admin.
// The organization membership is verified before querying data.
func (s *Service) GetStaffStats(
	ctx context.Context,
	organizationID int64,
	userID int64,
) (*StaffStats, error) {

	if organizationID <= 0 {
		return nil, ErrOrganizationID
	}

	role, err := s.organization.GetMemberRole(
		ctx,
		organizationID,
		userID,
	)
	if err != nil {
		return nil, ErrForbidden
	}

	role = strings.ToUpper(strings.TrimSpace(role))

	if role != "ADMIN" && role != "STAFF" {
		return nil, ErrForbidden
	}

	return s.repo.GetStaffStats(
		ctx,
		organizationID,
	)
}

func normalizeAnalyticsRange(
	value string,
) (AnalyticsRange, error) {

	value = strings.ToLower(
		strings.TrimSpace(value),
	)

	// Default analytics range.
	if value == "" {
		return Range30Days, nil
	}

	switch AnalyticsRange(value) {
	case Range7Days:
		return Range7Days, nil

	case Range30Days:
		return Range30Days, nil

	case Range90Days:
		return Range90Days, nil

	case Range12Months:
		return Range12Months, nil

	default:
		return "", ErrInvalidRange
	}
}

func isPlatformOwner(role string) bool {
	role = strings.ToLower(strings.TrimSpace(role))

	return role == "platform_owner" ||
		role == "owner"
}