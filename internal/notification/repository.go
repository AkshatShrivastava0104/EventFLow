package notification

import (
	"context"
	"errors"
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

// CreateNotification creates a notification for a user.
func (r *Repository) CreateNotification(
	ctx context.Context,
	userID int64,
	notificationType string,
	message string,
) (int64, error) {

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var notificationID int64

	err := r.db.QueryRow(ctx, `
		INSERT INTO notifications (
			user_id,
			type,
			message,
			status,
			created_at
		)
		VALUES (
			$1,
			$2,
			$3,
			'unread',
			NOW()
		)
		RETURNING id
	`,
		userID,
		notificationType,
		message,
	).Scan(&notificationID)

	if err != nil {
		return 0, err
	}

	return notificationID, nil
}

// GetUserNotifications returns notifications for a user.
func (r *Repository) GetUserNotifications(
	ctx context.Context,
	userID int64,
	page int,
	limit int,
) ([]Notification, int, error) {

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	offset := (page - 1) * limit

	var total int

	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM notifications
		WHERE user_id = $1
	`, userID).Scan(&total)

	if err != nil {
		return nil, 0, err
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			id,
			user_id,
			type,
			message,
			status,
			created_at
		FROM notifications
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2
		OFFSET $3
	`,
		userID,
		limit,
		offset,
	)

	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var notifications []Notification

	for rows.Next() {

		var notification Notification

		err := rows.Scan(
			&notification.ID,
			&notification.UserID,
			&notification.Type,
			&notification.Message,
			&notification.Status,
			&notification.CreatedAt,
		)

		if err != nil {
			return nil, 0, err
		}

		notifications = append(
			notifications,
			notification,
		)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	return notifications, total, nil
}

// MarkNotificationAsRead marks a notification as read.
func (r *Repository) MarkNotificationAsRead(
	ctx context.Context,
	notificationID int64,
	userID int64,
) error {

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	result, err := r.db.Exec(ctx, `
		UPDATE notifications
		SET status = 'read'
		WHERE id = $1
		  AND user_id = $2
		  AND status = 'unread'
	`,
		notificationID,
		userID,
	)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return errors.New("notification not found or already read")
	}

	return nil
}