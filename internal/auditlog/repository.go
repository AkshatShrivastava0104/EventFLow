package auditlog

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{
		db: db,
	}
}

func (r *Repository) CreateAuditLog(
	ctx context.Context,
	userID *int64,
	action string,
	entity string,
	entityID string,
	ipAddress *string,
) (int64, error) {

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var auditLogID int64

	err := r.db.QueryRow(ctx, `
		INSERT INTO audit_logs (
			user_id,
			action,
			entity,
			entity_id,
			ip_address,
			created_at
		)
		VALUES (
			$1,
			$2,
			$3,
			$4,
			$5,
			NOW()
		)
		RETURNING id
	`,
		userID,
		action,
		entity,
		entityID,
		ipAddress,
	).Scan(&auditLogID)

	if err != nil {
		return 0, err
	}

	return auditLogID, nil
}