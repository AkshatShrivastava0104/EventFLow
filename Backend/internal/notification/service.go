package notification

import "context"

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{
		repo: repo,
	}
}

// CreateNotification creates a notification for a specific user.
func (s *Service) CreateNotification(
	ctx context.Context,
	userID int64,
	notificationType string,
	message string,
) (int64, error) {

	return s.repo.CreateNotification(
		ctx,
		userID,
		notificationType,
		message,
	)
}

// CreatePlatformOwnerNotification creates a notification
// for all platform owners.
func (s *Service) CreatePlatformOwnerNotification(
	ctx context.Context,
	notificationType string,
	message string,
) (int64, error) {

	return s.repo.CreatePlatformOwnerNotification(
		ctx,
		notificationType,
		message,
	)
}

func (s *Service) GetUserNotifications(
	ctx context.Context,
	userID int64,
	page int,
	limit int,
) (*PaginatedNotifications, error) {

	notifications, total, err :=
		s.repo.GetUserNotifications(
			ctx,
			userID,
			page,
			limit,
		)

	if err != nil {
		return nil, err
	}

	totalPages := 0

	if total > 0 {
		totalPages =
			(total + limit - 1) / limit
	}

	return &PaginatedNotifications{
		Notifications: notifications,
		Pagination: Pagination{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: totalPages,
		},
	}, nil
}

func (s *Service) GetUnreadCount(
	ctx context.Context,
	userID int64,
) (int, error) {

	return s.repo.GetUnreadCount(
		ctx,
		userID,
	)
}

func (s *Service) MarkNotificationAsRead(
	ctx context.Context,
	notificationID int64,
	userID int64,
) error {

	return s.repo.MarkNotificationAsRead(
		ctx,
		notificationID,
		userID,
	)
}

func (s *Service) MarkAllNotificationsAsRead(
	ctx context.Context,
	userID int64,
) (int64, error) {

	return s.repo.MarkAllNotificationsAsRead(
		ctx,
		userID,
	)
}