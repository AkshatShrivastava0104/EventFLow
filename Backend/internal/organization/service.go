package organization

import (
	"context"
	"errors"
	"strings"

	"github.com/AkshatShrivastava0104/EventFlow/internal/auditlog"
	apperrors "github.com/AkshatShrivastava0104/EventFlow/internal/errors"
)

var ErrPaidPlanRequired = errors.New("a paid Pro or Plus plan is required")

type Service struct {
	repo         *Repository
	auditService *auditlog.Service
}

func NewService(
	repo *Repository,
	auditService *auditlog.Service,
) *Service {
	return &Service{
		repo:         repo,
		auditService: auditService,
	}
}

func (s *Service) CreateOrganization(
	ctx context.Context,
	name string,
	description string,
	ownerID int64,
) (int64, error) {

	name = strings.TrimSpace(name)
	description = strings.TrimSpace(description)

	if name == "" {
		return 0, apperrors.ErrInvalidInput
	}

	if len(name) > 100 {
		return 0, apperrors.ErrInvalidInput
	}

	if len(description) > 500 {
		return 0, apperrors.ErrInvalidInput
	}

	return 0, ErrPaidPlanRequired
}

func (s *Service) GetOrganizations(
	ctx context.Context,
	userID int64,
) ([]Organization, error) {
	return s.repo.GetOrganizationsByUserID(ctx, userID)
}

func (s *Service) GetOrganizationByID(
	ctx context.Context,
	organizationID int64,
	userID int64,
) (*Organization, error) {

	return s.repo.GetOrganizationByID(
		ctx,
		organizationID,
		userID,
	)
}

// CanManageOrganization returns true only for organization ADMINs.
func (s *Service) CanManageOrganization(
	ctx context.Context,
	organizationID int64,
	userID int64,
) (bool, error) {

	role, err := s.repo.GetMemberRole(
		ctx,
		organizationID,
		userID,
	)
	if err != nil {
		return false, err
	}

	return role == "ADMIN", nil
}

func (s *Service) UpdateOrganization(
	ctx context.Context,
	organizationID int64,
	userID int64,
	req UpdateOrganizationRequest,
) error {

	role, err := s.repo.GetMemberRole(
		ctx,
		organizationID,
		userID,
	)
	if err != nil {
		return apperrors.ErrForbidden
	}

	if role != "ADMIN" {
		return apperrors.ErrForbidden
	}

	req.Name = strings.TrimSpace(req.Name)
	req.Description = strings.TrimSpace(req.Description)

	if req.Name == "" {
		return apperrors.ErrInvalidInput
	}

	if len(req.Name) > 100 {
		return apperrors.ErrInvalidInput
	}

	if len(req.Description) > 500 {
		return apperrors.ErrInvalidInput
	}

	if err := s.repo.UpdateOrganization(
		ctx,
		organizationID,
		req.Name,
		req.Description,
	); err != nil {
		return err
	}

	if err := s.auditService.Log(
		ctx,
		&userID,
		"UPDATE_ORGANIZATION",
		"organization",
		organizationID,
		nil,
	); err != nil {
		return err
	}

	return nil
}

func (s *Service) AddMember(
	ctx context.Context,
	organizationID int64,
	requestingUserID int64,
	req AddMemberRequest,
) error {

	role, err := s.repo.GetMemberRole(
		ctx,
		organizationID,
		requestingUserID,
	)
	if err != nil {
		return apperrors.ErrForbidden
	}

	if role != "ADMIN" {
		return apperrors.ErrForbidden
	}

	switch req.Role {
	case "ADMIN", "STAFF":
	default:
		return apperrors.ErrInvalidInput
	}

	if err := s.repo.AddMember(
		ctx,
		organizationID,
		req.UserID,
		req.Role,
	); err != nil {
		return err
	}

	// A newly added member must not be able to continue using
	// sessions issued before the organization role was assigned.
	if err := s.repo.RevokeUserSessions(
		ctx,
		req.UserID,
	); err != nil {
		return err
	}

	if err := s.auditService.Log(
		ctx,
		&requestingUserID,
		"ADD_MEMBER",
		"organization_member",
		req.UserID,
		nil,
	); err != nil {
		return err
	}

	return nil
}

func (s *Service) GetMembers(
	ctx context.Context,
	organizationID int64,
	userID int64,
) ([]OrganizationMember, error) {

	_, err := s.repo.GetMemberRole(
		ctx,
		organizationID,
		userID,
	)
	if err != nil {
		return nil, errors.New("you are not a member of this organization")
	}

	return s.repo.GetMembers(
		ctx,
		organizationID,
	)
}

func (s *Service) UpdateMemberRole(
	ctx context.Context,
	organizationID int64,
	requestingUserID int64,
	targetUserID int64,
	newRole string,
) error {

	role, err := s.repo.GetMemberRole(
		ctx,
		organizationID,
		requestingUserID,
	)
	if err != nil {
		return apperrors.ErrForbidden
	}

	if role != "ADMIN" {
		return apperrors.ErrForbidden
	}

	switch newRole {
	case "ADMIN", "STAFF":
	default:
		return apperrors.ErrInvalidInput
	}

	targetRole, err := s.repo.GetMemberRole(
		ctx,
		organizationID,
		targetUserID,
	)
	if err != nil {
		return apperrors.ErrNotFound
	}

	// No need to invalidate sessions if the role is unchanged.
	if targetRole == newRole {
		return nil
	}

	// Prevent changing the only ADMIN to STAFF.
	if targetUserID == requestingUserID &&
		targetRole == "ADMIN" &&
		newRole == "STAFF" {

		members, err := s.repo.GetMembers(
			ctx,
			organizationID,
		)
		if err != nil {
			return err
		}

		adminCount := 0

		for _, member := range members {
			if member.Role == "ADMIN" {
				adminCount++
			}
		}

		if adminCount <= 1 {
			return apperrors.ErrForbidden
		}
	}

	if err := s.repo.UpdateMemberRole(
		ctx,
		organizationID,
		targetUserID,
		newRole,
	); err != nil {
		return err
	}

	// Role changed -> immediately invalidate all existing sessions.
	// The user must log in again and receive a fresh JWT containing
	// the current auth_version.
	if err := s.repo.RevokeUserSessions(
		ctx,
		targetUserID,
	); err != nil {
		return err
	}

	if err := s.auditService.Log(
		ctx,
		&requestingUserID,
		"CHANGE_MEMBER_ROLE",
		"organization_member",
		targetUserID,
		nil,
	); err != nil {
		return err
	}

	return nil
}

func (s *Service) RemoveMember(
	ctx context.Context,
	organizationID int64,
	requestingUserID int64,
	targetUserID int64,
) error {

	role, err := s.repo.GetMemberRole(
		ctx,
		organizationID,
		requestingUserID,
	)
	if err != nil {
		return apperrors.ErrForbidden
	}

	if role != "ADMIN" {
		return apperrors.ErrForbidden
	}

	targetRole, err := s.repo.GetMemberRole(
		ctx,
		organizationID,
		targetUserID,
	)
	if err != nil {
		return apperrors.ErrNotFound
	}

	// Prevent removing the last ADMIN.
	if targetRole == "ADMIN" {
		members, err := s.repo.GetMembers(
			ctx,
			organizationID,
		)
		if err != nil {
			return err
		}

		adminCount := 0

		for _, member := range members {
			if member.Role == "ADMIN" {
				adminCount++
			}
		}

		if adminCount <= 1 {
			return apperrors.ErrForbidden
		}
	}

	if err := s.repo.RemoveMember(
		ctx,
		organizationID,
		targetUserID,
	); err != nil {
		return err
	}

	// Membership removed -> immediately invalidate all existing
	// sessions so the removed user cannot continue using an
	// already-issued access token.
	if err := s.repo.RevokeUserSessions(
		ctx,
		targetUserID,
	); err != nil {
		return err
	}

	if err := s.auditService.Log(
		ctx,
		&requestingUserID,
		"REMOVE_MEMBER",
		"organization_member",
		targetUserID,
		nil,
	); err != nil {
		return err
	}

	return nil
}

// GetMemberRole exposes organization membership role to other services.
func (s *Service) GetMemberRole(
	ctx context.Context,
	organizationID int64,
	userID int64,
) (string, error) {

	return s.repo.GetMemberRole(
		ctx,
		organizationID,
		userID,
	)
}

func (s *Service) DeleteOrganization(
	ctx context.Context,
	organizationID int64,
	userID int64,
) error {

	role, err := s.repo.GetMemberRole(
		ctx,
		organizationID,
		userID,
	)
	if err != nil {
		return apperrors.ErrOrganizationNotFound
	}

	if role != "ADMIN" {
		return apperrors.ErrForbidden
	}

	if err := s.repo.DeleteOrganization(
		ctx,
		organizationID,
	); err != nil {
		return err
	}

	if err := s.auditService.Log(
		ctx,
		&userID,
		"DELETE_ORGANIZATION",
		"organization",
		organizationID,
		nil,
	); err != nil {
		return err
	}

	return nil
}
