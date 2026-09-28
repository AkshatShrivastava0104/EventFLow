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
			(
				SELECT count(*)
				FROM users u
				WHERE u.created_at::date = days.d
			) AS users,
			(
				SELECT count(*)
				FROM events e
				WHERE e.created_at::date = days.d
			) AS events,
			(
				SELECT count(*)
				FROM registrations g
				WHERE g.created_at::date = days.d
			) AS registrations
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
		WHERE (
			$1 = ''
			OR o.name ILIKE '%' || $1 || '%'
		)
	`, search).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			o.id,
			o.name,
			COALESCE(o.description, ''),
			COALESCE(o.website, ''),
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
		WHERE (
			$1 = ''
			OR o.name ILIKE '%' || $1 || '%'
		)
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
			&o.Website,
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

			/*
				Platform role is stored on users.
				Organization roles are stored separately
				in organization_members.

				Effective role for the platform users page:
				1. platform_owner
				2. ADMIN if user is ADMIN in any organization
				3. STAFF if user is STAFF in any organization
				4. user otherwise
			*/
			CASE
				WHEN LOWER(COALESCE(u.role, '')) = 'platform_owner'
					THEN 'platform_owner'

				WHEN EXISTS (
					SELECT 1
					FROM organization_members m
					WHERE m.user_id = u.id
						AND UPPER(m.role) = 'ADMIN'
				)
					THEN 'admin'

				WHEN EXISTS (
					SELECT 1
					FROM organization_members m
					WHERE m.user_id = u.id
						AND UPPER(m.role) = 'STAFF'
				)
					THEN 'staff'

				ELSE 'user'
			END AS effective_role,

			u.email_verified,

			(
				SELECT count(*)
				FROM organization_members m
				WHERE m.user_id = u.id
			) AS org_count,

			(
				SELECT count(*)
				FROM registrations g
				WHERE g.user_id = u.id
			) AS registration_count,

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

// ListRegistrations returns a platform-wide, read-only registration view.
//
// Filters:
//   - search: attendee name/email, event title, organization name, ticket number
//   - eventID: specific event
//   - organizationID: specific organization
//   - registrationStatus: registration status
//   - paymentStatus: payment status
//   - checkinStatus: all, checked_in, not_checked_in
//   - from: inclusive registration timestamp
//   - to: exclusive registration timestamp
//
// Ticket and check-in information are joined directly from the persisted
// tables. Activity is derived only from timestamps that actually exist in
// the database.
func (r *Repository) ListRegistrations(
	ctx context.Context,
	search string,
	eventID int64,
	organizationID int64,
	registrationStatus string,
	paymentStatus string,
	checkinStatus string,
	from *time.Time,
	to *time.Time,
	sort string,
	limit int,
	offset int,
) ([]AdminRegistration, int, error) {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	const baseWhere = `
		FROM registrations r
		INNER JOIN users u
			ON u.id = r.user_id
		INNER JOIN events e
			ON e.id = r.event_id
		INNER JOIN organizations o
			ON o.id = e.organization_id
		LEFT JOIN tickets t
			ON t.registration_id = r.id
		LEFT JOIN checkins c
			ON c.ticket_id = t.id
		LEFT JOIN users volunteer
			ON volunteer.id = c.volunteer_id
		WHERE
			(
				$1 = ''
				OR u.name ILIKE '%' || $1 || '%'
				OR u.email ILIKE '%' || $1 || '%'
				OR e.title ILIKE '%' || $1 || '%'
				OR o.name ILIKE '%' || $1 || '%'
				OR t.ticket_number ILIKE '%' || $1 || '%'
			)
			AND ($2 = 0 OR e.id = $2)
			AND ($3 = 0 OR o.id = $3)
			AND ($4 = '' OR r.status = $4)
			AND ($5 = '' OR r.payment_status = $5)
			AND (
				$6 = ''
				OR ($6 = 'checked_in' AND c.id IS NOT NULL)
				OR ($6 = 'not_checked_in' AND c.id IS NULL)
			)
			AND ($7::timestamptz IS NULL OR r.created_at >= $7::timestamptz)
			AND ($8::timestamptz IS NULL OR r.created_at < $8::timestamptz)
	`

	var total int

	countQuery := `
		SELECT count(*)
	` + baseWhere

	if err := r.db.QueryRow(
		ctx,
		countQuery,
		search,
		eventID,
		organizationID,
		registrationStatus,
		paymentStatus,
		checkinStatus,
		from,
		to,
	).Scan(&total); err != nil {
		return nil, 0, err
	}

	orderBy := "r.created_at DESC"

	switch sort {
	case "oldest":
		orderBy = "r.created_at ASC"

	case "newest":
		orderBy = "r.created_at DESC"

	case "attendee_asc":
		orderBy = "LOWER(COALESCE(u.name, '')) ASC, r.created_at DESC"

	case "attendee_desc":
		orderBy = "LOWER(COALESCE(u.name, '')) DESC, r.created_at DESC"

	case "event_asc":
		orderBy = "LOWER(e.title) ASC, r.created_at DESC"

	case "event_desc":
		orderBy = "LOWER(e.title) DESC, r.created_at DESC"

	case "checkin_latest":
		orderBy = "c.checked_in_at DESC NULLS LAST, r.created_at DESC"
	}

	query := `
		SELECT
			r.id,
			r.user_id,
			COALESCE(u.name, ''),
			COALESCE(u.email, ''),
			r.event_id,
			COALESCE(e.title, ''),
			e.organization_id,
			COALESCE(o.name, ''),
			r.status,
			r.payment_status,
			r.created_at,

			t.id,
			t.ticket_number,
			t.qr_code,
			t.created_at,

			c.id,
			c.ticket_id,
			c.volunteer_id,
			COALESCE(volunteer.name, ''),
			COALESCE(volunteer.email, ''),
			c.checked_in_at
	` + baseWhere + `
		ORDER BY ` + orderBy + `
		LIMIT $9 OFFSET $10
	`

	rows, err := r.db.Query(
		ctx,
		query,
		search,
		eventID,
		organizationID,
		registrationStatus,
		paymentStatus,
		checkinStatus,
		from,
		to,
		limit,
		offset,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	registrations := make([]AdminRegistration, 0, limit)

	for rows.Next() {
		var registration AdminRegistration

		var (
			ticketID      *int64
			ticketNumber  *string
			ticketQRCode  *string
			ticketCreatedAt *time.Time

			checkinID            *int64
			checkinTicketID      *int64
			checkinVolunteerID   *int64
			checkinVolunteerName *string
			checkinVolunteerEmail *string
			checkinAt            *time.Time
		)

		if err := rows.Scan(
			&registration.ID,
			&registration.UserID,
			&registration.UserName,
			&registration.UserEmail,
			&registration.EventID,
			&registration.EventTitle,
			&registration.OrganizationID,
			&registration.OrganizationName,
			&registration.RegistrationStatus,
			&registration.PaymentStatus,
			&registration.RegisteredAt,

			&ticketID,
			&ticketNumber,
			&ticketQRCode,
			&ticketCreatedAt,

			&checkinID,
			&checkinTicketID,
			&checkinVolunteerID,
			&checkinVolunteerName,
			&checkinVolunteerEmail,
			&checkinAt,
		); err != nil {
			return nil, 0, err
		}

		if ticketID != nil {
			registration.Ticket = &AdminRegistrationTicket{
				ID:           *ticketID,
				TicketNumber: valueOrEmpty(ticketNumber),
				QRCode:       valueOrEmpty(ticketQRCode),
				CreatedAt:    valueOrTime(ticketCreatedAt),
			}
		}

		if checkinID != nil {
			registration.Checkin = &AdminRegistrationCheckin{
				ID:             *checkinID,
				TicketID:       valueOrInt64(checkinTicketID),
				VolunteerID:    checkinVolunteerID,
				VolunteerName:  valueOrEmpty(checkinVolunteerName),
				VolunteerEmail: valueOrEmpty(checkinVolunteerEmail),
				CheckedInAt:    valueOrTime(checkinAt),
			}
		}

		registration.Activity = buildRegistrationActivity(
			registration.RegisteredAt,
			registration.Ticket,
			registration.Checkin,
			registration.PaymentStatus,
		)

		registrations = append(registrations, registration)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	return registrations, total, nil
}

func buildRegistrationActivity(
	registeredAt time.Time,
	ticket *AdminRegistrationTicket,
	checkin *AdminRegistrationCheckin,
	paymentStatus string,
) []AdminRegistrationActivity {
	activity := make([]AdminRegistrationActivity, 0, 3)

	activity = append(activity, AdminRegistrationActivity{
		Type:        "registration_created",
		Label:       "Registration created",
		OccurredAt:  registeredAt,
		Description: "Attendee registered for the event.",
	})

	/*
		Do not manufacture a payment timestamp.

		The current schema stores payment_status on registrations,
		but does not store payment initiated/succeeded timestamps.
		Therefore payment status can be displayed on the registration,
		but no fake payment activity is added to the timeline.
	*/
	_ = paymentStatus

	if ticket != nil {
		activity = append(activity, AdminRegistrationActivity{
			Type:        "ticket_created",
			Label:       "Ticket generated",
			OccurredAt:  ticket.CreatedAt,
			Description: "A ticket was generated for this registration.",
		})
	}

	if checkin != nil {
		description := "Ticket was checked in."

		if checkin.VolunteerName != "" {
			description = "Ticket was checked in by " + checkin.VolunteerName + "."
		} else if checkin.VolunteerEmail != "" {
			description = "Ticket was checked in by " + checkin.VolunteerEmail + "."
		}

		activity = append(activity, AdminRegistrationActivity{
			Type:        "checked_in",
			Label:       "Checked in",
			OccurredAt:  checkin.CheckedInAt,
			Description: description,
		})
	}

	return activity
}

func valueOrEmpty(value *string) string {
	if value == nil {
		return ""
	}

	return *value
}

func valueOrTime(value *time.Time) time.Time {
	if value == nil {
		return time.Time{}
	}

	return *value
}

func valueOrInt64(value *int64) int64 {
	if value == nil {
		return 0
	}

	return *value
}