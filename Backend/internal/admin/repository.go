package admin

import (
	"context"
	"math"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// GetStats computes platform-wide aggregate metrics.
func (r *Repository) GetStats(ctx context.Context) (*PlatformStats, error) {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	stats := &PlatformStats{
		EventsByStatus:        map[string]int{},
		RegistrationsByStatus: map[string]int{},
		Trend:                 []TrendPoint{},
	}

	err := r.db.QueryRow(ctx, `
		SELECT
			(SELECT count(*) FROM users),
			(SELECT count(*) FROM users WHERE role = 'platform_owner'),
			(SELECT count(*) FROM organizations),
			(SELECT count(*) FROM events),
			(SELECT count(*) FROM registrations),
			(SELECT count(*) FROM tickets),
			(SELECT count(*) FROM checkins)
	`).Scan(
		&stats.Totals.Users,
		&stats.Totals.Admins,
		&stats.Totals.Organizations,
		&stats.Totals.Events,
		&stats.Totals.Registrations,
		&stats.Totals.Tickets,
		&stats.Totals.Checkins,
	)
	if err != nil {
		return nil, err
	}

	err = r.db.QueryRow(ctx, `
		SELECT
			(SELECT count(*) FROM users WHERE created_at > now() - interval '30 days'),
			(SELECT count(*) FROM events WHERE created_at > now() - interval '30 days'),
			(SELECT count(*) FROM registrations WHERE created_at > now() - interval '30 days')
	`).Scan(
		&stats.NewUsers30d,
		&stats.NewEvents30d,
		&stats.NewRegistrations30d,
	)
	if err != nil {
		return nil, err
	}

	if err := r.scanCounts(
		ctx,
		`SELECT status, count(*) FROM events GROUP BY status`,
		stats.EventsByStatus,
	); err != nil {
		return nil, err
	}

	if err := r.scanCounts(
		ctx,
		`SELECT status, count(*) FROM registrations GROUP BY status`,
		stats.RegistrationsByStatus,
	); err != nil {
		return nil, err
	}

	if stats.Totals.Tickets > 0 {
		rate := float64(stats.Totals.Checkins) / float64(stats.Totals.Tickets)
		stats.CheckinRate = math.Round(rate*1000) / 1000
	}

	rows, err := r.db.Query(ctx, `
		WITH days AS (
			SELECT generate_series(
				(current_date - interval '13 days')::date,
				current_date,
				interval '1 day'
			)::date AS d
		)
		SELECT
			to_char(days.d, 'YYYY-MM-DD') AS date,
			(SELECT count(*) FROM users u
				WHERE u.created_at::date = days.d) AS users,
			(SELECT count(*) FROM events e
				WHERE e.created_at::date = days.d) AS events,
			(SELECT count(*) FROM registrations g
				WHERE g.created_at::date = days.d) AS registrations
		FROM days
		ORDER BY days.d
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var p TrendPoint

		if err := rows.Scan(
			&p.Date,
			&p.Users,
			&p.Events,
			&p.Registrations,
		); err != nil {
			return nil, err
		}

		stats.Trend = append(stats.Trend, p)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return stats, nil
}

func (r *Repository) scanCounts(
	ctx context.Context,
	query string,
	out map[string]int,
) error {
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var key string
		var count int

		if err := rows.Scan(&key, &count); err != nil {
			return err
		}

		out[key] = count
	}

	return rows.Err()
}

// ListOrganizations returns a paginated, optionally-searched list of all organizations.
func (r *Repository) ListOrganizations(
	ctx context.Context,
	search string,
	limit,
	offset int,
) ([]AdminOrganization, int, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var total int

	if err := r.db.QueryRow(ctx, `
		SELECT count(*)
		FROM organizations o
		WHERE ($1 = '' OR o.name ILIKE '%' || $1 || '%')
	`, search).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			o.id,
			o.name,
			COALESCE(o.description, ''),
			o.owner_id,
			COALESCE(u.name, ''),
			COALESCE(u.email, ''),
			(
				SELECT count(*)
				FROM organization_members m
				WHERE m.organization_id = o.id
			),
			(
				SELECT count(*)
				FROM events e
				WHERE e.organization_id = o.id
			),
			o.created_at
		FROM organizations o
		LEFT JOIN users u
			ON u.id = o.owner_id
		WHERE ($1 = '' OR o.name ILIKE '%' || $1 || '%')
		ORDER BY o.created_at DESC
		LIMIT $2 OFFSET $3
	`,
		search,
		limit,
		offset,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	orgs := make([]AdminOrganization, 0, limit)

	for rows.Next() {
		var o AdminOrganization

		if err := rows.Scan(
			&o.ID,
			&o.Name,
			&o.Description,
			&o.OwnerID,
			&o.OwnerName,
			&o.OwnerEmail,
			&o.MemberCount,
			&o.EventCount,
			&o.CreatedAt,
		); err != nil {
			return nil, 0, err
		}

		orgs = append(orgs, o)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	return orgs, total, nil
}

// ListUsers returns a paginated, optionally-searched list of all users.
func (r *Repository) ListUsers(
	ctx context.Context,
	search string,
	limit,
	offset int,
) ([]AdminUser, int, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var total int

	if err := r.db.QueryRow(ctx, `
		SELECT count(*)
		FROM users u
		WHERE (
			$1 = ''
			OR u.email ILIKE '%' || $1 || '%'
			OR u.name ILIKE '%' || $1 || '%'
		)
	`, search).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			u.id,
			COALESCE(u.name, ''),
			u.email,
			u.role,
			u.email_verified,
			(
				SELECT count(*)
				FROM organization_members m
				WHERE m.user_id = u.id
			),
			(
				SELECT count(*)
				FROM registrations g
				WHERE g.user_id = u.id
			),
			u.created_at
		FROM users u
		WHERE (
			$1 = ''
			OR u.email ILIKE '%' || $1 || '%'
			OR u.name ILIKE '%' || $1 || '%'
		)
		ORDER BY u.created_at DESC
		LIMIT $2 OFFSET $3
	`,
		search,
		limit,
		offset,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	users := make([]AdminUser, 0, limit)

	for rows.Next() {
		var u AdminUser

		if err := rows.Scan(
			&u.ID,
			&u.Name,
			&u.Email,
			&u.Role,
			&u.EmailVerified,
			&u.OrgCount,
			&u.RegistrationCount,
			&u.CreatedAt,
		); err != nil {
			return nil, 0, err
		}

		users = append(users, u)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	return users, total, nil
}