package organization

import (
	"context"
	"errors"

	"strings"

	"github.com/AkshatShrivastava0104/EventFlow/internal/auditlog"
	apperrors "github.com/AkshatShrivastava0104/EventFlow/internal/errors"
)


type Service struct {
	repo *Repository
	auditService *auditlog.Service
}

func NewService(repo *Repository, auditService *auditlog.Service) *Service {
	return &Service{
		repo: repo,
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

	// Validate organization data.
	if name == "" {
		return 0, apperrors.ErrInvalidInput
	}

	if len(name) > 100 {
		return 0, apperrors.ErrInvalidInput
	}

	if len(description) > 500 {
		return 0, apperrors.ErrInvalidInput
	}

	// Create organization.
	organizationID, err := s.repo.CreateOrganization(
		ctx,
		name,
		description,
		ownerID,
	)

	if err != nil {
		return 0, err
	}

	// Audit log.
	err = s.auditService.Log(
		ctx,
		&ownerID,
		"CREATE_ORGANIZATION",
		"organization",
		organizationID,
		nil,
	)

	if err != nil {
		return organizationID, err
	}

	return organizationID, nil
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

	return role == "OWNER" || role == "ADMIN", nil
}





func (s *Service) UpdateOrganization(
	ctx context.Context,
	organizationID int64,
	userID int64,
	req UpdateOrganizationRequest,
) error {

	// Check user's role in the organization.
	role, err := s.repo.GetMemberRole(
		ctx,
		organizationID,
		userID,
	)

	if err != nil {
		return apperrors.ErrForbidden
	}

	// Only OWNER and ADMIN can update organization.
	if role != "OWNER" && role != "ADMIN" {
		return apperrors.ErrForbidden
	}

	// Validate name.
	req.Name = strings.TrimSpace(req.Name)

	if req.Name == "" {
		return apperrors.ErrInvalidInput
	}

	if len(req.Name) > 100 {
		return apperrors.ErrInvalidInput
	}

	if len(req.Description) > 500 {
		return apperrors.ErrInvalidInput
	}

	// Update organization.
	err = s.repo.UpdateOrganization(
		ctx,
		organizationID,
		req.Name,
		req.Description,
	)

	if err != nil {
		return err
	}

	// Audit log.
	err = s.auditService.Log(
		ctx,
		&userID,
		"UPDATE_ORGANIZATION",
		"organization",
		organizationID,
		nil,
	)

	if err != nil {
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

	// Check requesting user's role
	role, err := s.repo.GetMemberRole(
		ctx,
		organizationID,
		requestingUserID,
	)

	if err != nil {
		return apperrors.ErrForbidden
	}

	// Only OWNER and ADMIN can add members
	if role != "OWNER" && role != "ADMIN" {
		return apperrors.ErrForbidden
	}

	// Validate role
	switch req.Role {
	case "ADMIN", "MEMBER", "VOLUNTEER":
		// valid
	default:
		return apperrors.ErrInvalidInput
	}

	// Add member
	err = s.repo.AddMember(
		ctx,
		organizationID,
		req.UserID,
		req.Role,
	)

	if err != nil {
		return err
	}

	// Audit log
	err = s.auditService.Log(
		ctx,
		&requestingUserID,
		"ADD_MEMBER",
		"organization_member",
		req.UserID,
		nil,
	)

	if err != nil {
		return err
	}

	return nil
}



func (s *Service) GetMembers(
	ctx context.Context,
	organizationID int64,
	userID int64,
) ([]OrganizationMember, error) {

	// User must be a member of the organization
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

	// Only OWNER can change member roles.
	role, err := s.repo.GetMemberRole(
		ctx,
		organizationID,
		requestingUserID,
	)

	if err != nil {
		return apperrors.ErrForbidden
	}

	if role != "OWNER" {
		return apperrors.ErrForbidden
	}

	// Validate new role.
	switch newRole {
	case "ADMIN", "MEMBER", "VOLUNTEER":
		// valid
	default:
		return apperrors.ErrInvalidInput
	}

	// Get target member's current role.
	targetRole, err := s.repo.GetMemberRole(
		ctx,
		organizationID,
		targetUserID,
	)

	if err != nil {
		return apperrors.ErrNotFound
	}

	// OWNER cannot be changed through this endpoint.
	if targetRole == "OWNER" {
		return apperrors.ErrForbidden
	}

	// Update role.
	err = s.repo.UpdateMemberRole(
		ctx,
		organizationID,
		targetUserID,
		newRole,
	)

	if err != nil {
		return err
	}

	// Audit log.
	err = s.auditService.Log(
		ctx,
		&requestingUserID,
		"CHANGE_MEMBER_ROLE",
		"organization_member",
		targetUserID,
		nil,
	)

	if err != nil {
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

	// Check requesting user's role
	role, err := s.repo.GetMemberRole(
		ctx,
		organizationID,
		requestingUserID,
	)

	if err != nil {
		return apperrors.ErrForbidden
	}

	// Only OWNER can remove members
	if role != "OWNER" {
		return apperrors.ErrForbidden
	}

	// Check target member
	targetRole, err := s.repo.GetMemberRole(
		ctx,
		organizationID,
		targetUserID,
	)

	if err != nil {
		return apperrors.ErrNotFound
	}

	// OWNER cannot remove OWNER
	if targetRole == "OWNER" {
		return apperrors.ErrForbidden
	}

	// Remove member
	err = s.repo.RemoveMember(
		ctx,
		organizationID,
		targetUserID,
	)

	if err != nil {
		return err
	}

	// Audit log
	err = s.auditService.Log(
		ctx,
		&requestingUserID,
		"REMOVE_MEMBER",
		"organization_member",
		targetUserID,
		nil,
	)

	if err != nil {
		return err
	}

	return nil
}




// Permission check for event management

// yeh allow krega Event Service ko for accessing the Organization Member Role

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

	// Check current user's role
	role, err := s.repo.GetMemberRole(
		ctx,
		organizationID,
		userID,
	)

	if err != nil {
		return apperrors.ErrOrganizationNotFound
	}

	// Only OWNER can delete organization
	if role != "OWNER" {
		return apperrors.ErrForbidden
	}

	// Delete organization
	err = s.repo.DeleteOrganization(
		ctx,
		organizationID,
	)

	if err != nil {
		return err
	}

	// Audit log
	err = s.auditService.Log(
		ctx,
		&userID,
		"DELETE_ORGANIZATION",
		"organization",
		organizationID,
		nil,
	)

	if err != nil {
		return err
	}

	return nil
}