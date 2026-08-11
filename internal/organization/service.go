package organization

import (
	"context"
	"errors"

	"github.com/AkshatShrivastava0104/EventFlow/internal/auth"
)

type Service struct {
    repo *auth.Repository
}

func NewService(repo *auth.Repository) *Service {
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