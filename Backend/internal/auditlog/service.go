package auditlog

import (
	"context"
	"strconv"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{
		repo: repo,
	}
}

func (s *Service) Log(
	ctx context.Context,
	userID *int64,
	action string,
	entity string,
	entityID int64,
	ipAddress *string,
) error {

	_, err := s.repo.CreateAuditLog(
		ctx,
		userID,
		action,
		entity,
		strconv.FormatInt(entityID, 10),
		ipAddress,
	)
	return err
}