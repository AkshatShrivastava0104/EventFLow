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
) ([]Notification, error) {

	return s.repo.GetUserNotifications(
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