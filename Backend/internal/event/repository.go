package event

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"time"

	apperrors "github.com/AkshatShrivastava0104/EventFlow/internal/errors"
	"github.com/AkshatShrivastava0104/EventFlow/internal/outbox"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db         *pgxpool.Pool
	outboxRepo *outbox.Repository
}

func NewRepository(
	db *pgxpool.Pool,
	outboxRepo *outbox.Repository,
) *Repository {
	return &Repository{
		db:         db,
		outboxRepo: outboxRepo,
	}
}

func (r *Repository) CreateEvent(
	ctx context.Context,
	event *Event,
) (int64, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var eventID int64

	err := r.db.QueryRow(ctx, `
		INSERT INTO events (
			organization_id,
			title,
			slug,
			description,
			venue,
			address,
			city,
			country,
			category,
			cover_image,
			tags,
			featured,
			visibility,
			capacity,
			max_tickets_per_user,
			allow_waitlist,
			registration_deadline,
			start_time,
			end_time,
			price,
			status,
			created_at,
			updated_at
		)
		VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8,
			$9, $10, $11, $12, $13, $14, $15, $16,
			$17, $18, $19, $20,
			'draft',
			NOW(),
			NOW()
		)
		RETURNING id
	`,
		event.OrganizationID,
		event.Title,
		event.Slug,
		event.Description,
		event.Venue,
		event.Address,
		event.City,
		event.Country,
		event.Category,
		event.CoverImage,
		event.Tags,
		event.Featured,
		event.Visibility,
		event.Capacity,
		event.MaxTicketsPerUser,
		event.AllowWaitlist,
		event.RegistrationDeadline,
		event.StartTime,
		event.EndTime,
		event.Price,
	).Scan(&eventID)

	if err != nil {
		return 0, err
	}

	return eventID, nil
}

func (r *Repository) GetEventsByOrganizationID(
	ctx context.Context,
	organizationID int64,
	page int,
	limit int,
) ([]Event, int, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	offset := (page - 1) * limit

	var total int

	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM events
		WHERE organization_id = $1
	`, organizationID).Scan(&total)

	if err != nil {
		return nil, 0, err
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			id,
			organization_id,
			title,
			COALESCE(slug, '') AS slug,
			COALESCE(description, '') AS description,
			COALESCE(venue, '') AS venue,
			COALESCE(address, '') AS address,
			COALESCE(city, '') AS city,
			COALESCE(country, 'India') AS country,
			COALESCE(category, 'Music') AS category,
			COALESCE(cover_image, '') AS cover_image,
			COALESCE(tags, '{}'::text[]) AS tags,
			COALESCE(featured, FALSE) AS featured,
			COALESCE(visibility, 'public') AS visibility,
			capacity,
			max_tickets_per_user,
			COALESCE(allow_waitlist, FALSE) AS allow_waitlist,
			registration_deadline,
			start_time,
			end_time,
			COALESCE(price, 0) AS price,
			status,
			created_at,
			updated_at
		FROM events
		WHERE organization_id = $1
		ORDER BY created_at DESC
		LIMIT $2
		OFFSET $3
	`,
		organizationID,
		limit,
		offset,
	)

	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	events := make([]Event, 0)

	for rows.Next() {
		var event Event

		err := rows.Scan(
			&event.ID,
			&event.OrganizationID,
			&event.Title,
			&event.Slug,
			&event.Description,
			&event.Venue,
			&event.Address,
			&event.City,
			&event.Country,
			&event.Category,
			&event.CoverImage,
			&event.Tags,
			&event.Featured,
			&event.Visibility,
			&event.Capacity,
			&event.MaxTicketsPerUser,
			&event.AllowWaitlist,
			&event.RegistrationDeadline,
			&event.StartTime,
			&event.EndTime,
			&event.Price,
			&event.Status,
			&event.CreatedAt,
			&event.UpdatedAt,
		)

		if err != nil {
			return nil, 0, err
		}

		events = append(events, event)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	return events, total, nil
}

func (r *Repository) GetEventByID(
	ctx context.Context,
	eventID int64,
) (*Event, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var event Event

	err := r.db.QueryRow(ctx, `
		SELECT
			id,
			organization_id,
			title,
			COALESCE(slug, '') AS slug,
			COALESCE(description, '') AS description,
			COALESCE(venue, '') AS venue,
			COALESCE(address, '') AS address,
			COALESCE(city, '') AS city,
			COALESCE(country, 'India') AS country,
			COALESCE(category, 'Music') AS category,
			COALESCE(cover_image, '') AS cover_image,
			COALESCE(tags, '{}'::text[]) AS tags,
			COALESCE(featured, FALSE) AS featured,
			COALESCE(visibility, 'public') AS visibility,
			capacity,
			max_tickets_per_user,
			COALESCE(allow_waitlist, FALSE) AS allow_waitlist,
			registration_deadline,
			start_time,
			end_time,
			COALESCE(price, 0) AS price,
			status,
			created_at,
			updated_at
		FROM events
		WHERE id = $1
	`, eventID).Scan(
		&event.ID,
		&event.OrganizationID,
		&event.Title,
		&event.Slug,
		&event.Description,
		&event.Venue,
		&event.Address,
		&event.City,
		&event.Country,
		&event.Category,
		&event.CoverImage,
		&event.Tags,
		&event.Featured,
		&event.Visibility,
		&event.Capacity,
		&event.MaxTicketsPerUser,
		&event.AllowWaitlist,
		&event.RegistrationDeadline,
		&event.StartTime,
		&event.EndTime,
		&event.Price,
		&event.Status,
		&event.CreatedAt,
		&event.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperrors.ErrEventNotFound
		}

		return nil, err
	}

	return &event, nil
}

func (r *Repository) UpdateEvent(
	ctx context.Context,
	eventID int64,
	req UpdateEventRequest,
) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	result, err := r.db.Exec(ctx, `
		UPDATE events
		SET
			title = $1,
			slug = $2,
			description = $3,
			venue = $4,
			address = $5,
			city = $6,
			country = $7,
			category = $8,
			cover_image = $9,
			tags = $10,
			featured = $11,
			visibility = $12,
			capacity = $13,
			max_tickets_per_user = $14,
			allow_waitlist = $15,
			registration_deadline = $16,
			start_time = $17,
			end_time = $18,
			price = $19,
			updated_at = NOW()
		WHERE id = $20
	`,
		req.Title,
		req.Slug,
		req.Description,
		req.Venue,
		req.Address,
		req.City,
		req.Country,
		req.Category,
		req.CoverImage,
		req.Tags,
		req.Featured,
		req.Visibility,
		req.Capacity,
		req.MaxTicketsPerUser,
		req.AllowWaitlist,
		req.RegistrationDeadline,
		req.StartTime,
		req.EndTime,
		req.Price,
		eventID,
	)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return apperrors.ErrEventNotFound
	}

	return nil
}

// UpdateCoverImage updates only the cover image path/URL of an event.
//
// The upload flow is:
// 1. Handler receives multipart file.
// 2. File is stored in ./uploads/events.
// 3. Service verifies event ownership/RBAC.
// 4. Service calls this method with the stored file URL.
// 5. Event details then return the URL through cover_image.
func (r *Repository) UpdateCoverImage(
	ctx context.Context,
	eventID int64,
	coverImage string,
) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	result, err := r.db.Exec(ctx, `
		UPDATE events
		SET
			cover_image = $1,
			updated_at = NOW()
		WHERE id = $2
	`,
		coverImage,
		eventID,
	)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return apperrors.ErrEventNotFound
	}

	return nil
}

func (r *Repository) DeleteEvent(
	ctx context.Context,
	eventID int64,
) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	result, err := r.db.Exec(ctx, `
		DELETE FROM events
		WHERE id = $1
	`, eventID)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return apperrors.ErrEventNotFound
	}

	return nil
}

func (r *Repository) PublishEvent(
	ctx context.Context,
	eventID int64,
) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	result, err := r.db.Exec(ctx, `
		UPDATE events
		SET
			status = 'published',
			updated_at = NOW()
		WHERE id = $1
		  AND status = 'draft'
	`,
		eventID,
	)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return errors.New(
			"event not found or cannot be published",
		)
	}

	return nil
}

func (r *Repository) CancelEvent(
	ctx context.Context,
	eventID int64,
) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback(ctx)
	}()

	result, err := tx.Exec(ctx, `
		UPDATE events
		SET
			status = 'cancelled',
			updated_at = NOW()
		WHERE id = $1
		  AND status IN ('draft', 'published')
	`,
		eventID,
	)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return apperrors.ErrInvalidInput
	}

	rows, err := tx.Query(ctx, `
		SELECT user_id
		FROM registrations
		WHERE event_id = $1
		  AND status != 'cancelled'
	`,
		eventID,
	)

	if err != nil {
		return err
	}
	defer rows.Close()

	var userIDs []int64

	for rows.Next() {
		var userID int64

		if err := rows.Scan(&userID); err != nil {
			return err
		}

		userIDs = append(userIDs, userID)
	}

	if err := rows.Err(); err != nil {
		return err
	}

	for _, userID := range userIDs {
		_, err := r.outboxRepo.Create(
			ctx,
			tx,
			"NOTIFICATION",
			"event",
			strconv.FormatInt(eventID, 10),
			map[string]interface{}{
				"user_id": userID,
				"type":    "EVENT_CANCELLED",
				"message": "The event you registered for has been cancelled.",
			},
		)

		if err != nil {
			return err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return err
	}

	return nil
}

func (r *Repository) CompleteEvent(
	ctx context.Context,
	eventID int64,
) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	result, err := r.db.Exec(ctx, `
		UPDATE events
		SET
			status = 'completed',
			updated_at = NOW()
		WHERE id = $1
		  AND status = 'published'
	`,
		eventID,
	)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return errors.New(
			"event not found or cannot be completed",
		)
	}

	return nil
}

func (r *Repository) GetActiveRegistrantUserIDs(
	ctx context.Context,
	eventID int64,
) ([]int64, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	rows, err := r.db.Query(ctx, `
		SELECT user_id
		FROM registrations
		WHERE event_id = $1
		  AND status != 'cancelled'
		ORDER BY created_at ASC
	`,
		eventID,
	)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var userIDs []int64

	for rows.Next() {
		var userID int64

		if err := rows.Scan(&userID); err != nil {
			return nil, err
		}

		userIDs = append(userIDs, userID)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return userIDs, nil
}

func (r *Repository) GetAllEvents(
	ctx context.Context,
	page int,
	limit int,
	status string,
	order string,
	search string,
	category string,
	city string,
	price string,
	sort string,
) ([]Event, int, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	offset := (page - 1) * limit

	status = strings.TrimSpace(
		strings.ToLower(status),
	)

	order = strings.ToLower(
		strings.TrimSpace(order),
	)

	search = strings.TrimSpace(search)
	category = strings.TrimSpace(category)
	city = strings.TrimSpace(city)
	price = strings.TrimSpace(
		strings.ToLower(price),
	)
	sort = strings.TrimSpace(
		strings.ToLower(sort),
	)

	if order != "asc" {
		order = "desc"
	}

	/*
		Build the WHERE conditions once.

		The same conditions are used for:
		1. COUNT(*)
		2. Actual event query

		This keeps pagination totals accurate.
	*/
	conditions := make([]string, 0, 5)
	args := make([]interface{}, 0, 8)
	argIndex := 1

	if status != "" && status != "all" {
		conditions = append(
			conditions,
			"status = $"+strconv.Itoa(argIndex),
		)

		args = append(args, status)
		argIndex++
	}

	/*
		Public browse lifecycle:

		- Published events remain visible on their event day.
		- Once the event ended before today, it is hidden from
		  the public published-event listing.
		- Admin/owner requests using status=all or status=completed
		  are not affected.

		CURRENT_DATE is intentional: an event remains visible for
		its complete calendar day and disappears the next day.
	*/
	if status == "published" {
		conditions = append(
			conditions,
			`(
				end_time IS NULL
				OR end_time >= CURRENT_DATE
			)`,
		)
	}

	/*
		Search across the most useful event fields.

		Title
		Description
		Venue
		Address
		City
		Country
		Category
		Slug
		Tags
	*/
	if search != "" {
		searchCondition := `
			(
				title ILIKE '%' || $%d || '%'
				OR COALESCE(description, '') ILIKE '%' || $%d || '%'
				OR COALESCE(venue, '') ILIKE '%' || $%d || '%'
				OR COALESCE(address, '') ILIKE '%' || $%d || '%'
				OR COALESCE(city, '') ILIKE '%' || $%d || '%'
				OR COALESCE(country, '') ILIKE '%' || $%d || '%'
				OR COALESCE(category, '') ILIKE '%' || $%d || '%'
				OR COALESCE(slug, '') ILIKE '%' || $%d || '%'
				OR EXISTS (
					SELECT 1
					FROM unnest(COALESCE(tags, '{}'::text[])) AS tag
					WHERE tag ILIKE '%' || $%d || '%'
				)
			)
		`

		placeholder := strconv.Itoa(argIndex)

		searchCondition = strings.ReplaceAll(
			searchCondition,
			"%d",
			placeholder,
		)

		conditions = append(
			conditions,
			searchCondition,
		)

		args = append(args, search)
		argIndex++
	}

	/*
		Category filter is case-insensitive exact match.

		Example:
		category=Music

		Matches:
		Music
		music
		MUSIC

		But does not match:
		Musical
	*/
	if category != "" &&
		strings.ToLower(category) != "all" {
		conditions = append(
			conditions,
			"LOWER(COALESCE(category, '')) = LOWER($"+strconv.Itoa(argIndex)+")",
		)

		args = append(args, category)
		argIndex++
	}

	/*
		City uses partial case-insensitive matching.

		Example:
		city=Delhi

		Can match:
		New Delhi
		Delhi
		Delhi NCR
	*/
	if city != "" &&
		strings.ToLower(city) != "all" {
		conditions = append(
			conditions,
			"COALESCE(city, '') ILIKE '%' || $"+strconv.Itoa(argIndex)+" || '%'",
		)

		args = append(args, city)
		argIndex++
	}

	/*
		Price filter:

		any  -> no price condition
		free -> price = 0
		paid -> price > 0
	*/
	switch price {
	case "free":
		conditions = append(
			conditions,
			"COALESCE(price, 0) = 0",
		)

	case "paid":
		conditions = append(
			conditions,
			"COALESCE(price, 0) > 0",
		)
	}

	whereClause := ""

	if len(conditions) > 0 {
		whereClause = " WHERE " + strings.Join(
			conditions,
			" AND ",
		)
	}

	/*
		Count must use exactly the same filters as the
		actual event query.
	*/
	countQuery := `
		SELECT COUNT(*)
		FROM events
	` + whereClause

	var total int

	if err := r.db.QueryRow(
		ctx,
		countQuery,
		args...,
	).Scan(&total); err != nil {
		return nil, 0, err
	}

	/*
		Sorting.

		Supported frontend values:

		soonest
		price-asc
		price-desc
		popular

		There is currently no registration-count/popularity
		column in the Event model/schema available here.

		So "popular" uses featured-first and newest-first
		as the closest existing database-backed signal.
	*/
	orderBy := "created_at DESC"

	switch sort {
	case "soonest":
		orderBy = `
			CASE
				WHEN start_time IS NULL THEN 1
				ELSE 0
			END ASC,
			start_time ASC,
			created_at DESC
		`

	case "price-asc":
		orderBy = `
			COALESCE(price, 0) ASC,
			created_at DESC
		`

	case "price-desc":
		orderBy = `
			COALESCE(price, 0) DESC,
			created_at DESC
		`

	case "popular":
		orderBy = `
			featured DESC,
			created_at DESC
		`

	default:
		if order == "asc" {
			orderBy = "created_at ASC"
		} else {
			orderBy = "created_at DESC"
		}
	}

	query := `
		SELECT
			id,
			organization_id,
			title,
			COALESCE(slug, '') AS slug,
			COALESCE(description, '') AS description,
			COALESCE(venue, '') AS venue,
			COALESCE(address, '') AS address,
			COALESCE(city, '') AS city,
			COALESCE(country, 'India') AS country,
			COALESCE(category, 'Music') AS category,
			COALESCE(cover_image, '') AS cover_image,
			COALESCE(tags, '{}'::text[]) AS tags,
			COALESCE(featured, FALSE) AS featured,
			COALESCE(visibility, 'public') AS visibility,
			capacity,
			max_tickets_per_user,
			COALESCE(allow_waitlist, FALSE) AS allow_waitlist,
			registration_deadline,
			start_time,
			end_time,
			COALESCE(price, 0) AS price,
			status,
			created_at,
			updated_at
		FROM events
	` + whereClause + `
		ORDER BY ` + orderBy + `
		LIMIT $` + strconv.Itoa(argIndex) + `
		OFFSET $` + strconv.Itoa(argIndex+1)

	queryArgs := make(
		[]interface{},
		0,
		len(args)+2,
	)

	queryArgs = append(
		queryArgs,
		args...,
	)

	queryArgs = append(
		queryArgs,
		limit,
		offset,
	)

	rows, err := r.db.Query(
		ctx,
		query,
		queryArgs...,
	)

	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	events := make([]Event, 0)

	for rows.Next() {
		var event Event

		err := rows.Scan(
			&event.ID,
			&event.OrganizationID,
			&event.Title,
			&event.Slug,
			&event.Description,
			&event.Venue,
			&event.Address,
			&event.City,
			&event.Country,
			&event.Category,
			&event.CoverImage,
			&event.Tags,
			&event.Featured,
			&event.Visibility,
			&event.Capacity,
			&event.MaxTicketsPerUser,
			&event.AllowWaitlist,
			&event.RegistrationDeadline,
			&event.StartTime,
			&event.EndTime,
			&event.Price,
			&event.Status,
			&event.CreatedAt,
			&event.UpdatedAt,
		)

		if err != nil {
			return nil, 0, err
		}

		events = append(events, event)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	return events, total, nil
}