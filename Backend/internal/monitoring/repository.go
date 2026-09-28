package monitoring

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

// ListActivityLogs returns platform-wide activity logs.
func (r *Repository) ListActivityLogs(
	ctx context.Context,
	search string,
	action string,
	entityType string,
	limit int,
	offset int,
) ([]ActivityLog, int, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	const whereClause = `
		WHERE
			(
				$1 = ''
				OR u.name ILIKE '%' || $1 || '%'
				OR u.email ILIKE '%' || $1 || '%'
				OR al.action ILIKE '%' || $1 || '%'
				OR al.entity_type ILIKE '%' || $1 || '%'
				OR al.description ILIKE '%' || $1 || '%'
			)
			AND ($2 = '' OR al.action = $2)
			AND ($3 = '' OR al.entity_type = $3)
	`

	var total int

	countQuery := `
		SELECT count(*)
		FROM activity_logs al
		LEFT JOIN users u
			ON u.id = al.user_id
	` + whereClause

	if err := r.db.QueryRow(
		ctx,
		countQuery,
		search,
		action,
		entityType,
	).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			al.id,
			al.user_id,
			COALESCE(u.name, ''),
			COALESCE(u.email, ''),
			al.action,
			al.entity_type,
			al.entity_id,
			COALESCE(al.description, ''),
			COALESCE(al.ip_address, ''),
			al.created_at
		FROM activity_logs al
		LEFT JOIN users u
			ON u.id = al.user_id
	`+whereClause+`
		ORDER BY al.created_at DESC
		LIMIT $4 OFFSET $5
	`,
		search,
		action,
		entityType,
		limit,
		offset,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	logs := make([]ActivityLog, 0, limit)

	for rows.Next() {
		var log ActivityLog

		if err := rows.Scan(
			&log.ID,
			&log.UserID,
			&log.UserName,
			&log.UserEmail,
			&log.Action,
			&log.EntityType,
			&log.EntityID,
			&log.Description,
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

// ListPlatformTickets returns all tickets across the platform.
func (r *Repository) ListPlatformTickets(
	ctx context.Context,
	search string,
	organizationID int64,
	eventID int64,
	checkinStatus string,
	limit int,
	offset int,
) ([]PlatformTicket, int, error) {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	const whereClause = `
		WHERE
			(
				$1 = ''
				OR t.ticket_number ILIKE '%' || $1 || '%'
				OR u.name ILIKE '%' || $1 || '%'
				OR u.email ILIKE '%' || $1 || '%'
				OR e.title ILIKE '%' || $1 || '%'
				OR o.name ILIKE '%' || $1 || '%'
			)
			AND ($2 = 0 OR o.id = $2)
			AND ($3 = 0 OR e.id = $3)
			AND (
				$4 = ''
				OR ($4 = 'checked_in' AND c.id IS NOT NULL)
				OR ($4 = 'not_checked_in' AND c.id IS NULL)
			)
	`

	var total int

	countQuery := `
		SELECT count(*)
		FROM tickets t
		INNER JOIN registrations r
			ON r.id = t.registration_id
		INNER JOIN users u
			ON u.id = r.user_id
		INNER JOIN events e
			ON e.id = r.event_id
		INNER JOIN organizations o
			ON o.id = e.organization_id
		LEFT JOIN checkins c
			ON c.ticket_id = t.id
	` + whereClause

	if err := r.db.QueryRow(
		ctx,
		countQuery,
		search,
		organizationID,
		eventID,
		checkinStatus,
	).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			t.id,
			COALESCE(t.ticket_number, ''),
			COALESCE(t.qr_code, ''),
			r.id,
			u.id,
			COALESCE(u.name, ''),
			COALESCE(u.email, ''),
			e.id,
			COALESCE(e.title, ''),
			o.id,
			COALESCE(o.name, ''),
			r.status,
			r.payment_status,

			CASE
				WHEN c.id IS NOT NULL THEN 'checked_in'
				ELSE 'not_checked_in'
			END,

			c.checked_in_at,
			t.created_at
		FROM tickets t
		INNER JOIN registrations r
			ON r.id = t.registration_id
		INNER JOIN users u
			ON u.id = r.user_id
		INNER JOIN events e
			ON e.id = r.event_id
		INNER JOIN organizations o
			ON o.id = e.organization_id
		LEFT JOIN checkins c
			ON c.ticket_id = t.id
	`+whereClause+`
		ORDER BY t.created_at DESC
		LIMIT $5 OFFSET $6
	`,
		search,
		organizationID,
		eventID,
		checkinStatus,
		limit,
		offset,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	tickets := make([]PlatformTicket, 0, limit)

	for rows.Next() {
		var ticket PlatformTicket

		if err := rows.Scan(
			&ticket.ID,
			&ticket.TicketNumber,
			&ticket.QRCode,
			&ticket.RegistrationID,
			&ticket.UserID,
			&ticket.UserName,
			&ticket.UserEmail,
			&ticket.EventID,
			&ticket.EventTitle,
			&ticket.OrganizationID,
			&ticket.OrganizationName,
			&ticket.RegistrationStatus,
			&ticket.PaymentStatus,
			&ticket.CheckinStatus,
			&ticket.CheckedInAt,
			&ticket.CreatedAt,
		); err != nil {
			return nil, 0, err
		}

		tickets = append(tickets, ticket)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	return tickets, total, nil
}

// Ping checks whether PostgreSQL is reachable.
func (r *Repository) Ping(ctx context.Context) (time.Duration, error) {
	start := time.Now()

	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	if err := r.db.Ping(ctx); err != nil {
		return 0, err
	}

	return time.Since(start), nil
}