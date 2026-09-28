package auditlog

import (
	"context"
	"math"
	"strconv"
	"strings"
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

// ListAuditLogs returns paginated platform audit logs.
func (s *Service) ListAuditLogs(
	ctx context.Context,
	search string,
	action string,
	entity string,
	page int,
	limit int,
) (*PaginatedAuditLogs, error) {
	search = strings.TrimSpace(search)
	action = strings.TrimSpace(action)
	entity = strings.TrimSpace(entity)

	if page < 1 {
		page = 1
	}

	if limit < 1 {
		limit = 25
	}

	if limit > 100 {
		limit = 100
	}

	offset := (page - 1) * limit

	logs, total, err := s.repo.ListAuditLogs(
		ctx,
		search,
		action,
		entity,
		limit,
		offset,
	)
	if err != nil {
		return nil, err
	}

	totalPages := 0

	if total > 0 {
		totalPages = int(math.Ceil(
			float64(total) / float64(limit),
		))
	}

	return &PaginatedAuditLogs{
		Logs: logs,
		Pagination: Pagination{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: totalPages,
		},
	}, nil
}

// GetAuditLogByID returns one audit log entry.
func (s *Service) GetAuditLogByID(
	ctx context.Context,
	id int64,
) (*AuditLog, error) {
	return s.repo.GetAuditLogByID(ctx, id)
}