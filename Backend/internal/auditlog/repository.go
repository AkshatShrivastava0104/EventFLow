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

// CreateAuditLog creates a new audit log entry.
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

// ListAuditLogs returns platform-wide audit logs with pagination.
//
// Supported filters:
//   - search: user name, email, action, entity, entity ID
//   - action: exact action
//   - entity: exact entity
func (r *Repository) ListAuditLogs(
	ctx context.Context,
	search string,
	action string,
	entity string,
	limit int,
	offset int,
) ([]AuditLog, int, error) {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	const whereClause = `
		WHERE
			(
				$1 = ''
				OR u.name ILIKE '%' || $1 || '%'
				OR u.email ILIKE '%' || $1 || '%'
				OR al.action ILIKE '%' || $1 || '%'
				OR al.entity ILIKE '%' || $1 || '%'
				OR al.entity_id ILIKE '%' || $1 || '%'
			)
			AND ($2 = '' OR al.action = $2)
			AND ($3 = '' OR al.entity = $3)
	`

	var total int

	err := r.db.QueryRow(
		ctx,
		`
			SELECT COUNT(*)
			FROM audit_logs al
			LEFT JOIN users u
				ON u.id = al.user_id
		`+whereClause,
		search,
		action,
		entity,
	).Scan(&total)

	if err != nil {
		return nil, 0, err
	}

	rows, err := r.db.Query(
		ctx,
		`
			SELECT
				al.id,
				al.user_id,
				COALESCE(u.name, ''),
				COALESCE(u.email, ''),
				COALESCE(u.role, 'user'),
				al.action,
				al.entity,
				al.entity_id,
				al.ip_address,
				al.created_at
			FROM audit_logs al
			LEFT JOIN users u
				ON u.id = al.user_id
		`+whereClause+`
			ORDER BY al.created_at DESC, al.id DESC
			LIMIT $4
			OFFSET $5
		`,
		search,
		action,
		entity,
		limit,
		offset,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	logs := make([]AuditLog, 0, limit)

	for rows.Next() {
		var log AuditLog

		if err := rows.Scan(
			&log.ID,
			&log.UserID,
			&log.UserName,
			&log.UserEmail,
			&log.UserRole,
			&log.Action,
			&log.Entity,
			&log.EntityID,
			&log.IPAddress,
			&log.CreatedAt,
		); err != nil {
			return nil, 0, err
		}

		logs = append(logs, log)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	return logs, total, nil
}

// GetAuditLogByID returns a single audit log entry.
func (r *Repository) GetAuditLogByID(
	ctx context.Context,
	id int64,
) (*AuditLog, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var log AuditLog

	err := r.db.QueryRow(
		ctx,
		`
			SELECT
				al.id,
				al.user_id,
				COALESCE(u.name, ''),
				COALESCE(u.email, ''),
				COALESCE(u.role, 'user'),
				al.action,
				al.entity,
				al.entity_id,
				al.ip_address,
				al.created_at
			FROM audit_logs al
			LEFT JOIN users u
				ON u.id = al.user_id
			WHERE al.id = $1
		`,
		id,
	).Scan(
		&log.ID,
		&log.UserID,
		&log.UserName,
		&log.UserEmail,
		&log.UserRole,
		&log.Action,
		&log.Entity,
		&log.EntityID,
		&log.IPAddress,
		&log.CreatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &log, nil
}