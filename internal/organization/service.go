package organization

import (
	"context"
	"errors"

	"strings"

	"github.com/AkshatShrivastava0104/EventFlow/internal/auth"
)


type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{
		repo: repo,
	}
}

func (s *Service) CreateOrganization(
	ctx context.Context,
	req auth.CreateOrganizationRequest,
	ownerID int64,
) (int64, error) {

	if req.Name == "" {
		return 0, errors.New("organization name is required")
	}

	return s.repo.CreateOrganization(
		ctx,
		req.Name,
		req.Description,
		ownerID,
	)
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

	// 1. Check whether user has permission
	canManage, err := s.CanManageOrganization(
		ctx,
		organizationID,
		userID,
	)

	if err != nil {
		return err
	}

	if !canManage {
		return errors.New("permission denied")
	}

	req.Name = strings.TrimSpace(req.Name)

	if req.Name == "" {
		return errors.New("organization name is required")
	}

	if len(req.Name) > 100 {
		return errors.New("organization name cannot exceed 100 characters")
	}

	if len(req.Description) > 500 {
		return errors.New("description cannot exceed 500 characters")
	}

	// 3. Update database
	return s.repo.UpdateOrganization(
		ctx,
		organizationID,
		req.Name,
		req.Description,
	)
}




func (s *Service) AddMember(
	ctx context.Context,
	organizationID int64,
	requestingUserID int64,
	req AddMemberRequest,
) error {

	// Only OWNER/ADMIN can add members
	canManage, err := s.CanManageOrganization(
		ctx,
		organizationID,
		requestingUserID,
	)

	if err != nil {
		return err
	}

	if !canManage {
		return errors.New("permission denied")
	}

	// Validate role
	switch req.Role {
	case "ADMIN", "MEMBER", "VOLUNTEER":
		// valid
	default:
		return errors.New("invalid role")
	}

	// Add member
	return s.repo.AddMember(
		ctx,
		organizationID,
		req.UserID,
		req.Role,
	)
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

	// Only OWNER can change roles
	role, err := s.repo.GetMemberRole(
		ctx,
		organizationID,
		requestingUserID,
	)

	if err != nil {
		return errors.New("you are not a member of this organization")
	}

	if role != "OWNER" {
		return errors.New("only owner can change member roles")
	}

	// Validate new role
	switch newRole {
	case "ADMIN", "MEMBER", "VOLUNTEER":
		// valid
	default:
		return errors.New("invalid role")
	}

	// Prevent changing owner's role through this API
	targetRole, err := s.repo.GetMemberRole(
		ctx,
		organizationID,
		targetUserID,
	)

	if err != nil {
		return errors.New("target user is not a member")
	}

	if targetRole == "OWNER" {
		return errors.New("owner role cannot be changed")
	}

	return s.repo.UpdateMemberRole(
		ctx,
		organizationID,
		targetUserID,
		newRole,
	)
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
		return errors.New("you are not a member of this organization")
	}

	// Only OWNER can remove members
	if role != "OWNER" {
		return errors.New("only owner can remove members")
	}

	// Check target user's role
	targetRole, err := s.repo.GetMemberRole(
		ctx,
		organizationID,
		targetUserID,
	)

	if err != nil {
		return errors.New("target user is not a member")
	}

	// Never remove OWNER through this API
	if targetRole == "OWNER" {
		return errors.New("owner cannot be removed")
	}

	return s.repo.RemoveMember(
		ctx,
		organizationID,
		targetUserID,
	)
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