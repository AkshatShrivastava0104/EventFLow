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

func (s *Service) GetUserNotifications(
	ctx context.Context,
	userID int64,
	page int,
	limit int,
) (*PaginatedNotifications, error) {

	notifications, total, err := s.repo.GetUserNotifications(
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
		totalPages = (total + limit - 1) / limit
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