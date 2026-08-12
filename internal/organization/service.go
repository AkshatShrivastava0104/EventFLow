package organization

import (
	"context"
	"errors"

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