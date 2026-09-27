package stats

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

// ============================================================
// PLATFORM STATS
// ============================================================

func (r *Repository) GetPlatformStats(
	ctx context.Context,
) (*PlatformStats, error) {

	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	stats := &PlatformStats{}

	// ----------------------------------------------------------
	// Main platform counters
	// ----------------------------------------------------------

	err := r.db.QueryRow(ctx, `
		SELECT
			(SELECT COUNT(*) FROM users),
			(SELECT COUNT(*) FROM organizations),
			(
				SELECT COUNT(DISTINCT organization_id)
				FROM organization_members
			),
			(SELECT COUNT(*) FROM events),
			(SELECT COUNT(*) FROM events WHERE status = 'published'),
			(SELECT COUNT(*) FROM events WHERE status = 'draft'),
			(SELECT COUNT(*) FROM events WHERE status = 'cancelled'),
			(SELECT COUNT(*) FROM events WHERE status = 'completed'),
			(SELECT COUNT(*) FROM registrations),
			(
				SELECT COUNT(*)
				FROM registrations
				WHERE status != 'cancelled'
			),
			(SELECT COUNT(*) FROM tickets),
			(SELECT COUNT(*) FROM checkins)
	`).Scan(
		&stats.Users,
		&stats.Organizations,
		&stats.ActiveOrganizations,
		&stats.Events,
		&stats.PublishedEvents,
		&stats.DraftEvents,
		&stats.CancelledEvents,
		&stats.CompletedEvents,
		&stats.Registrations,
		&stats.ActiveRegistrations,
		&stats.Tickets,
		&stats.CheckIns,
	)

	if err != nil {
		return nil, err
	}

	stats.AttendanceRate = calculateAttendanceRate(
		stats.CheckIns,
		stats.ActiveRegistrations,
	)

	// ----------------------------------------------------------
	// This month
	// ----------------------------------------------------------

	err = r.db.QueryRow(ctx, `
		SELECT
			(SELECT COUNT(*)
			 FROM users
			 WHERE created_at >= date_trunc('month', NOW())),

			(SELECT COUNT(*)
			 FROM organizations
			 WHERE created_at >= date_trunc('month', NOW())),

			(SELECT COUNT(*)
			 FROM events
			 WHERE created_at >= date_trunc('month', NOW())),

			(SELECT COUNT(*)
			 FROM registrations
			 WHERE created_at >= date_trunc('month', NOW()))
	`).Scan(
		&stats.UsersThisMonth,
		&stats.OrganizationsThisMonth,
		&stats.EventsThisMonth,
		&stats.RegistrationsThisMonth,
	)

	if err != nil {
		return nil, err
	}

	// ----------------------------------------------------------
	// Monthly activity
	// ----------------------------------------------------------

	stats.Monthly, err = r.getPlatformMonthlyStats(ctx)
	if err != nil {
		return nil, err
	}

	// ----------------------------------------------------------
	// Top organizations
	// ----------------------------------------------------------

	stats.TopOrganizations, err = r.getTopOrganizations(ctx)
	if err != nil {
		return nil, err
	}

	// ----------------------------------------------------------
	// Top events
	// ----------------------------------------------------------

	stats.TopEvents, err = r.getTopEvents(ctx, 5)
	if err != nil {
		return nil, err
	}

	return stats, nil
}

func (r *Repository) getPlatformMonthlyStats(
	ctx context.Context,
) ([]MonthlyStats, error) {

	rows, err := r.db.Query(ctx, `
		WITH months AS (
			SELECT generate_series(
				date_trunc('month', NOW()) - INTERVAL '5 months',
				date_trunc('month', NOW()),
				INTERVAL '1 month'
			) AS month
		)

		SELECT
			TO_CHAR(m.month, 'YYYY-MM') AS month,

			(
				SELECT COUNT(*)
				FROM users u
				WHERE u.created_at >= m.month
				  AND u.created_at < m.month + INTERVAL '1 month'
			),

			(
				SELECT COUNT(*)
				FROM organizations o
				WHERE o.created_at >= m.month
				  AND o.created_at < m.month + INTERVAL '1 month'
			),

			(
				SELECT COUNT(*)
				FROM events e
				WHERE e.created_at >= m.month
				  AND e.created_at < m.month + INTERVAL '1 month'
			),

			(
				SELECT COUNT(*)
				FROM registrations r
				WHERE r.created_at >= m.month
				  AND r.created_at < m.month + INTERVAL '1 month'
			),

			(
				SELECT COUNT(*)
				FROM checkins c
				WHERE c.checked_in_at >= m.month
				  AND c.checked_in_at < m.month + INTERVAL '1 month'
			)

		FROM months m
		ORDER BY m.month
	`)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]MonthlyStats, 0, 6)

	for rows.Next() {

		var item MonthlyStats

		err := rows.Scan(
			&item.Month,
			&item.Users,
			&item.Organizations,
			&item.Events,
			&item.Registrations,
			&item.CheckIns,
		)

		if err != nil {
			return nil, err
		}

		result = append(result, item)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return result, nil
}

func (r *Repository) getTopOrganizations(
	ctx context.Context,
) ([]TopOrganization, error) {

	rows, err := r.db.Query(ctx, `
		SELECT
			o.id,
			o.name,

			COUNT(DISTINCT e.id) AS events,

			COUNT(
				DISTINCT CASE
					WHEN reg.status != 'cancelled'
					THEN reg.id
				END
			) AS registrations,

			COUNT(DISTINCT om.user_id) AS members

		FROM organizations o

		LEFT JOIN events e
			ON e.organization_id = o.id

		LEFT JOIN registrations reg
			ON reg.event_id = e.id

		LEFT JOIN organization_members om
			ON om.organization_id = o.id

		GROUP BY o.id, o.name

		ORDER BY registrations DESC, events DESC, o.id

		LIMIT 5
	`)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]TopOrganization, 0, 5)

	for rows.Next() {

		var item TopOrganization

		err := rows.Scan(
			&item.ID,
			&item.Name,
			&item.Events,
			&item.Registrations,
			&item.Members,
		)

		if err != nil {
			return nil, err
		}

		result = append(result, item)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return result, nil
}

func (r *Repository) getTopEvents(
	ctx context.Context,
	limit int,
) ([]TopEvent, error) {

	rows, err := r.db.Query(ctx, `
		SELECT
			e.id,
			e.organization_id,
			e.title,
			e.status,
			e.start_time,
			e.capacity,

			COUNT(
				DISTINCT CASE
					WHEN r.status != 'cancelled'
					THEN r.id
				END
			) AS registrations,

			COUNT(DISTINCT c.id) AS check_ins

		FROM events e

		LEFT JOIN registrations r
			ON r.event_id = e.id

		LEFT JOIN tickets t
			ON t.registration_id = r.id

		LEFT JOIN checkins c
			ON c.ticket_id = t.id

		GROUP BY
			e.id,
			e.organization_id,
			e.title,
			e.status,
			e.start_time,
			e.capacity

		ORDER BY registrations DESC, e.created_at DESC

		LIMIT $1
	`, limit)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]TopEvent, 0, limit)

	for rows.Next() {

		var item TopEvent

		err := rows.Scan(
			&item.ID,
			&item.OrganizationID,
			&item.Title,
			&item.Status,
			&item.StartTime,
			&item.Capacity,
			&item.Registrations,
			&item.CheckIns,
		)

		if err != nil {
			return nil, err
		}

		item.AttendanceRate = calculateAttendanceRate(
			item.CheckIns,
			item.Registrations,
		)

		result = append(result, item)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return result, nil
}

// ============================================================
// ORGANIZATION STATS
// ============================================================

func (r *Repository) GetOrganizationStats(
	ctx context.Context,
	organizationID int64,
	analyticsRange string,
) (*OrganizationStats, error) {

	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	stats := &OrganizationStats{
		OrganizationID: organizationID,
	}

	err := r.db.QueryRow(ctx, `
		SELECT name
		FROM organizations
		WHERE id = $1
	`, organizationID).Scan(
		&stats.OrganizationName,
	)

	if err != nil {
		return nil, err
	}

	// ----------------------------------------------------------
	// Selected analytics period
	// ----------------------------------------------------------
	//
	// 7d  = last 7 days
	// 30d = last 30 days
	// 90d = last 90 days
	// 12m = last 12 months
	//
	// The service validates the range before it reaches the
	// repository. CASE is still used here so no SQL is built
	// dynamically.
	// ----------------------------------------------------------

	periodStart := `
		CASE $2
			WHEN '7d'  THEN NOW() - INTERVAL '7 days'
			WHEN '30d' THEN NOW() - INTERVAL '30 days'
			WHEN '90d' THEN NOW() - INTERVAL '90 days'
			WHEN '12m' THEN NOW() - INTERVAL '12 months'
			ELSE NOW() - INTERVAL '30 days'
		END
	`

	// ----------------------------------------------------------
	// Events + registrations + tickets + check-ins
	// ----------------------------------------------------------

	query := `
		WITH period AS (
			SELECT
				` + periodStart + ` AS start_at,
				NOW() AS end_at
		)
		SELECT
			(
				SELECT COUNT(*)
				FROM events e
				CROSS JOIN period p
				WHERE e.organization_id = $1
				  AND e.created_at >= p.start_at
				  AND e.created_at < p.end_at
			),

			(
				SELECT COUNT(*)
				FROM events e
				WHERE e.organization_id = $1
				  AND e.start_time > NOW()
				  AND e.status = 'published'
			),

			(
				SELECT COUNT(*)
				FROM events e
				CROSS JOIN period p
				WHERE e.organization_id = $1
				  AND e.status = 'published'
				  AND e.created_at >= p.start_at
				  AND e.created_at < p.end_at
			),

			(
				SELECT COUNT(*)
				FROM events e
				CROSS JOIN period p
				WHERE e.organization_id = $1
				  AND e.status = 'draft'
				  AND e.created_at >= p.start_at
				  AND e.created_at < p.end_at
			),

			(
				SELECT COUNT(*)
				FROM events e
				CROSS JOIN period p
				WHERE e.organization_id = $1
				  AND e.status = 'cancelled'
				  AND e.created_at >= p.start_at
				  AND e.created_at < p.end_at
			),

			(
				SELECT COUNT(*)
				FROM events e
				CROSS JOIN period p
				WHERE e.organization_id = $1
				  AND e.status = 'completed'
				  AND e.created_at >= p.start_at
				  AND e.created_at < p.end_at
			),

			(
				SELECT COUNT(*)
				FROM registrations r
				INNER JOIN events e
					ON e.id = r.event_id
				CROSS JOIN period p
				WHERE e.organization_id = $1
				  AND r.created_at >= p.start_at
				  AND r.created_at < p.end_at
			),

			(
				SELECT COUNT(*)
				FROM registrations r
				INNER JOIN events e
					ON e.id = r.event_id
				CROSS JOIN period p
				WHERE e.organization_id = $1
				  AND r.status != 'cancelled'
				  AND r.created_at >= p.start_at
				  AND r.created_at < p.end_at
			),

			(
				SELECT COUNT(*)
				FROM tickets t
				INNER JOIN registrations r
					ON r.id = t.registration_id
				INNER JOIN events e
					ON e.id = r.event_id
				CROSS JOIN period p
				WHERE e.organization_id = $1
				  AND t.created_at >= p.start_at
				  AND t.created_at < p.end_at
			),

			(
				SELECT COUNT(*)
				FROM checkins c
				INNER JOIN tickets t
					ON t.id = c.ticket_id
				INNER JOIN registrations r
					ON r.id = t.registration_id
				INNER JOIN events e
					ON e.id = r.event_id
				CROSS JOIN period p
				WHERE e.organization_id = $1
				  AND c.checked_in_at >= p.start_at
				  AND c.checked_in_at < p.end_at
			)
	`

	err = r.db.QueryRow(
		ctx,
		query,
		organizationID,
		analyticsRange,
	).Scan(
		&stats.Events,
		&stats.UpcomingEvents,
		&stats.PublishedEvents,
		&stats.DraftEvents,
		&stats.CancelledEvents,
		&stats.CompletedEvents,
		&stats.Registrations,
		&stats.ActiveRegistrations,
		&stats.Tickets,
		&stats.CheckIns,
	)

	if err != nil {
		return nil, err
	}

	stats.AttendanceRate = calculateAttendanceRate(
		stats.CheckIns,
		stats.ActiveRegistrations,
	)

	// ----------------------------------------------------------
	// Members
	// ----------------------------------------------------------

	err = r.db.QueryRow(ctx, `
		SELECT
			COUNT(*),
			COUNT(*) FILTER (WHERE role = 'ADMIN'),
			COUNT(*) FILTER (WHERE role = 'STAFF')
		FROM organization_members
		WHERE organization_id = $1
	`, organizationID).Scan(
		&stats.Members,
		&stats.Admins,
		&stats.Staff,
	)

	if err != nil {
		return nil, err
	}

	// ----------------------------------------------------------
	// This month
	// ----------------------------------------------------------

	err = r.db.QueryRow(ctx, `
		SELECT
			(
				SELECT COUNT(*)
				FROM registrations r
				INNER JOIN events e
					ON e.id = r.event_id
				WHERE e.organization_id = $1
				  AND r.created_at >= date_trunc('month', NOW())
			),

			(
				SELECT COUNT(*)
				FROM events
				WHERE organization_id = $1
				  AND created_at >= date_trunc('month', NOW())
			)
	`, organizationID).Scan(
		&stats.RegistrationsThisMonth,
		&stats.EventsThisMonth,
	)

	if err != nil {
		return nil, err
	}

	// ----------------------------------------------------------
	// Range-aware activity chart
	// ----------------------------------------------------------

	stats.Monthly, err = r.getOrganizationMonthlyStats(
		ctx,
		organizationID,
		analyticsRange,
	)
	if err != nil {
		return nil, err
	}

	// ----------------------------------------------------------
	// Range-aware top events
	// ----------------------------------------------------------

	stats.TopEvents, err = r.getOrganizationTopEvents(
		ctx,
		organizationID,
		5,
		analyticsRange,
	)
	if err != nil {
		return nil, err
	}

	// ----------------------------------------------------------
	// Upcoming events are intentionally NOT range limited.
	// They represent future operational activity.
	// ----------------------------------------------------------

	stats.Upcoming, err = r.getUpcomingEvents(
		ctx,
		organizationID,
		5,
	)
	if err != nil {
		return nil, err
	}

	return stats, nil
}

func (r *Repository) getOrganizationMonthlyStats(
	ctx context.Context,
	organizationID int64,
	analyticsRange string,
) ([]MonthlyStats, error) {

	// 7d / 30d  -> daily points
	// 90d        -> weekly points
	// 12m        -> monthly points
	query := `
		WITH settings AS (
			SELECT
				CASE $2
					WHEN '7d'  THEN NOW() - INTERVAL '7 days'
					WHEN '30d' THEN NOW() - INTERVAL '30 days'
					WHEN '90d' THEN NOW() - INTERVAL '90 days'
					WHEN '12m' THEN NOW() - INTERVAL '12 months'
					ELSE NOW() - INTERVAL '30 days'
				END AS start_at,

				NOW() AS end_at,

				CASE $2
					WHEN '90d' THEN INTERVAL '7 days'
					WHEN '12m' THEN INTERVAL '1 month'
					ELSE INTERVAL '1 day'
				END AS bucket_size
		),

		buckets AS (
			SELECT
				generate_series(
					CASE
						WHEN $2 = '12m'
							THEN date_trunc(
								'month',
								(SELECT start_at FROM settings)
							)
						WHEN $2 = '90d'
							THEN date_trunc(
								'week',
								(SELECT start_at FROM settings)
							)
						ELSE date_trunc(
							'day',
							(SELECT start_at FROM settings)
						)
					END,

					CASE
						WHEN $2 = '12m'
							THEN date_trunc('month', NOW())
						WHEN $2 = '90d'
							THEN date_trunc('week', NOW())
						ELSE date_trunc('day', NOW())
					END,

					(SELECT bucket_size FROM settings)
				) AS bucket
		)

		SELECT
			CASE
				WHEN $2 = '12m'
					THEN TO_CHAR(b.bucket, 'YYYY-MM')
				WHEN $2 = '90d'
					THEN TO_CHAR(b.bucket, 'YYYY-MM-DD')
				ELSE TO_CHAR(b.bucket, 'YYYY-MM-DD')
			END AS period,

			0::BIGINT AS users,
			0::BIGINT AS organizations,

			(
				SELECT COUNT(*)
				FROM events e
				WHERE e.organization_id = $1
				  AND e.created_at >= b.bucket
				  AND e.created_at < b.bucket +
					CASE
						WHEN $2 = '12m' THEN INTERVAL '1 month'
						WHEN $2 = '90d' THEN INTERVAL '7 days'
						ELSE INTERVAL '1 day'
					END
				  AND e.created_at <= NOW()
			),

			(
				SELECT COUNT(*)
				FROM registrations r
				INNER JOIN events e
					ON e.id = r.event_id
				WHERE e.organization_id = $1
				  AND r.created_at >= b.bucket
				  AND r.created_at < b.bucket +
					CASE
						WHEN $2 = '12m' THEN INTERVAL '1 month'
						WHEN $2 = '90d' THEN INTERVAL '7 days'
						ELSE INTERVAL '1 day'
					END
				  AND r.created_at <= NOW()
			),

			(
				SELECT COUNT(*)
				FROM checkins c
				INNER JOIN tickets t
					ON t.id = c.ticket_id
				INNER JOIN registrations r
					ON r.id = t.registration_id
				INNER JOIN events e
					ON e.id = r.event_id
				WHERE e.organization_id = $1
				  AND c.checked_in_at >= b.bucket
				  AND c.checked_in_at < b.bucket +
					CASE
						WHEN $2 = '12m' THEN INTERVAL '1 month'
						WHEN $2 = '90d' THEN INTERVAL '7 days'
						ELSE INTERVAL '1 day'
					END
				  AND c.checked_in_at <= NOW()
			)

		FROM buckets b
		ORDER BY b.bucket
	`

	rows, err := r.db.Query(
		ctx,
		query,
		organizationID,
		analyticsRange,
	)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]MonthlyStats, 0)

	for rows.Next() {
		var item MonthlyStats

		err := rows.Scan(
			&item.Month,
			&item.Users,
			&item.Organizations,
			&item.Events,
			&item.Registrations,
			&item.CheckIns,
		)

		if err != nil {
			return nil, err
		}

		result = append(result, item)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return result, nil
}

func (r *Repository) getOrganizationTopEvents(
	ctx context.Context,
	organizationID int64,
	limit int,
	analyticsRange string,
) ([]TopEvent, error) {

	query := `
		WITH period AS (
			SELECT
				CASE $3
					WHEN '7d'  THEN NOW() - INTERVAL '7 days'
					WHEN '30d' THEN NOW() - INTERVAL '30 days'
					WHEN '90d' THEN NOW() - INTERVAL '90 days'
					WHEN '12m' THEN NOW() - INTERVAL '12 months'
					ELSE NOW() - INTERVAL '30 days'
				END AS start_at,
				NOW() AS end_at
		)

		SELECT
			e.id,
			e.organization_id,
			e.title,
			e.status,
			e.start_time,
			e.capacity,

			COUNT(
				DISTINCT CASE
					WHEN r.status != 'cancelled'
					 AND r.created_at >= p.start_at
					 AND r.created_at < p.end_at
					THEN r.id
				END
			) AS registrations,

			COUNT(
				DISTINCT CASE
					WHEN c.checked_in_at >= p.start_at
					 AND c.checked_in_at < p.end_at
					THEN c.id
				END
			) AS check_ins

		FROM events e

		CROSS JOIN period p

		LEFT JOIN registrations r
			ON r.event_id = e.id

		LEFT JOIN tickets t
			ON t.registration_id = r.id

		LEFT JOIN checkins c
			ON c.ticket_id = t.id

		WHERE e.organization_id = $1

		GROUP BY
			e.id,
			e.organization_id,
			e.title,
			e.status,
			e.start_time,
			e.capacity

		HAVING COUNT(
			DISTINCT CASE
				WHEN r.status != 'cancelled'
				 AND r.created_at >= p.start_at
				 AND r.created_at < p.end_at
				THEN r.id
			END
		) > 0

		ORDER BY registrations DESC, e.created_at DESC

		LIMIT $2
	`

	rows, err := r.db.Query(
		ctx,
		query,
		organizationID,
		limit,
		analyticsRange,
	)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]TopEvent, 0, limit)

	for rows.Next() {
		var item TopEvent

		err := rows.Scan(
			&item.ID,
			&item.OrganizationID,
			&item.Title,
			&item.Status,
			&item.StartTime,
			&item.Capacity,
			&item.Registrations,
			&item.CheckIns,
		)

		if err != nil {
			return nil, err
		}

		item.AttendanceRate = calculateAttendanceRate(
			item.CheckIns,
			item.Registrations,
		)

		result = append(result, item)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return result, nil
}

func (r *Repository) getUpcomingEvents(
	ctx context.Context,
	organizationID int64,
	limit int,
) ([]UpcomingEvent, error) {

	rows, err := r.db.Query(ctx, `
		SELECT
			e.id,
			e.title,
			e.status,
			e.start_time,
			e.end_time,
			COALESCE(e.venue, ''),
			e.capacity,

			COUNT(
				DISTINCT CASE
					WHEN r.status != 'cancelled'
					THEN r.id
				END
			),

			COUNT(DISTINCT c.id)

		FROM events e

		LEFT JOIN registrations r
			ON r.event_id = e.id

		LEFT JOIN tickets t
			ON t.registration_id = r.id

		LEFT JOIN checkins c
			ON c.ticket_id = t.id

		WHERE e.organization_id = $1
		  AND e.start_time > NOW()
		  AND e.status = 'published'

		GROUP BY
			e.id,
			e.title,
			e.status,
			e.start_time,
			e.end_time,
			e.venue,
			e.capacity

		ORDER BY e.start_time ASC

		LIMIT $2
	`,
		organizationID,
		limit,
	)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]UpcomingEvent, 0, limit)

	for rows.Next() {

		var item UpcomingEvent

		err := rows.Scan(
			&item.ID,
			&item.Title,
			&item.Status,
			&item.StartTime,
			&item.EndTime,
			&item.Venue,
			&item.Capacity,
			&item.Registrations,
			&item.CheckIns,
		)

		if err != nil {
			return nil, err
		}

		result = append(result, item)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return result, nil
}

// ============================================================
// STAFF STATS
// ============================================================

func (r *Repository) GetStaffStats(
	ctx context.Context,
	organizationID int64,
) (*StaffStats, error) {

	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	stats := &StaffStats{
		OrganizationID: organizationID,
	}

	err := r.db.QueryRow(ctx, `
		SELECT
			(
				SELECT COUNT(*)
				FROM events
				WHERE organization_id = $1
				  AND status = 'published'
				  AND start_time >= CURRENT_DATE
				  AND start_time < CURRENT_DATE + INTERVAL '1 day'
			),

			(
				SELECT COUNT(*)
				FROM events
				WHERE organization_id = $1
				  AND status = 'published'
				  AND start_time > NOW()
			),

			(
				SELECT COUNT(*)
				FROM registrations r
				INNER JOIN events e
					ON e.id = r.event_id
				WHERE e.organization_id = $1
				  AND e.status = 'published'
				  AND e.start_time >= CURRENT_DATE
				  AND e.start_time < CURRENT_DATE + INTERVAL '1 day'
				  AND r.status != 'cancelled'
			),

			(
				SELECT COUNT(*)
				FROM checkins c
				INNER JOIN tickets t
					ON t.id = c.ticket_id
				INNER JOIN registrations r
					ON r.id = t.registration_id
				INNER JOIN events e
					ON e.id = r.event_id
				WHERE e.organization_id = $1
				  AND c.checked_in_at >= CURRENT_DATE
				  AND c.checked_in_at < CURRENT_DATE + INTERVAL '1 day'
			)
	`,
		organizationID,
	).Scan(
		&stats.TodayEvents,
		&stats.UpcomingEvents,
		&stats.ExpectedAttendees,
		&stats.CheckInsToday,
	)

	if err != nil {
		return nil, err
	}

	stats.PendingCheckIns = stats.ExpectedAttendees - stats.CheckInsToday

	if stats.PendingCheckIns < 0 {
		stats.PendingCheckIns = 0
	}

	stats.TodayEventsList, err = r.getTodayEvents(
		ctx,
		organizationID,
	)

	if err != nil {
		return nil, err
	}

	return stats, nil
}

func (r *Repository) getTodayEvents(
	ctx context.Context,
	organizationID int64,
) ([]UpcomingEvent, error) {

	rows, err := r.db.Query(ctx, `
		SELECT
			e.id,
			e.title,
			e.status,
			e.start_time,
			e.end_time,
			COALESCE(e.venue, ''),
			e.capacity,

			COUNT(
				DISTINCT CASE
					WHEN r.status != 'cancelled'
					THEN r.id
				END
			),

			COUNT(DISTINCT c.id)

		FROM events e

		LEFT JOIN registrations r
			ON r.event_id = e.id

		LEFT JOIN tickets t
			ON t.registration_id = r.id

		LEFT JOIN checkins c
			ON c.ticket_id = t.id

		WHERE e.organization_id = $1
		  AND e.status = 'published'
		  AND e.start_time >= CURRENT_DATE
		  AND e.start_time < CURRENT_DATE + INTERVAL '1 day'

		GROUP BY
			e.id,
			e.title,
			e.status,
			e.start_time,
			e.end_time,
			e.venue,
			e.capacity

		ORDER BY e.start_time ASC
	`,
		organizationID,
	)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]UpcomingEvent, 0)

	for rows.Next() {

		var item UpcomingEvent

		err := rows.Scan(
			&item.ID,
			&item.Title,
			&item.Status,
			&item.StartTime,
			&item.EndTime,
			&item.Venue,
			&item.Capacity,
			&item.Registrations,
			&item.CheckIns,
		)

		if err != nil {
			return nil, err
		}

		result = append(result, item)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return result, nil
}

// ============================================================
// HELPERS
// ============================================================

func calculateAttendanceRate(
	checkIns int64,
	registrations int64,
) float64 {

	if registrations <= 0 {
		return 0
	}

	return float64(checkIns) / float64(registrations) * 100
}