package payment

import (
	"context"
	"errors"
	"regexp"
	"strings"
)

var lastFourPattern = regexp.MustCompile(`^\d{4}$`)

type Service struct {
	repo paymentRepository
}

type paymentRepository interface {
	CreateEventIntent(context.Context, int64, int64, int) (*Intent, error)
	CreateSubscriptionIntent(context.Context, int64, string, string) (*Intent, error)
	Confirm(context.Context, int64, string, bool) (*Confirmation, error)
	ListOrganizationPayments(context.Context, int64, int64) (*OrganizationPayments, error)
}

func NewService(repo paymentRepository) *Service {
	return &Service{repo: repo}
}

func (s *Service) CreateIntent(
	ctx context.Context,
	userID int64,
	request CreateIntentRequest,
) (*Intent, error) {
	switch strings.ToLower(strings.TrimSpace(request.Purpose)) {
	case "", "event":
		if request.EventID <= 0 {
			return nil, ErrInvalidRequest
		}
		if request.Quantity == 0 {
			request.Quantity = 1
		}
		if !isValidQuantity(request.Quantity) {
			return nil, ErrInvalidRequest
		}
		return s.repo.CreateEventIntent(ctx, userID, request.EventID, request.Quantity)
	case "subscription":
		if request.Quantity != 0 && request.Quantity != 1 {
			return nil, ErrInvalidRequest
		}
		plan := strings.ToLower(strings.TrimSpace(request.Plan))
		if plan != "pro" && plan != "plus" {
			return nil, ErrInvalidRequest
		}
		name, err := validateOrganizationName(request.OrganizationName)
		if err != nil {
			return nil, err
		}
		return s.repo.CreateSubscriptionIntent(ctx, userID, plan, name)
	default:
		return nil, ErrInvalidRequest
	}
}

func (s *Service) Confirm(
	ctx context.Context,
	userID int64,
	orderID string,
	testCardLastFour string,
) (*Confirmation, error) {
	if !lastFourPattern.MatchString(testCardLastFour) {
		return nil, ErrInvalidRequest
	}
	if strings.TrimSpace(orderID) == "" {
		return nil, ErrInvalidRequest
	}
	return s.repo.Confirm(ctx, userID, orderID, testCardLastFour == "4242")
}

func (s *Service) ListOrganizationPayments(
	ctx context.Context,
	userID int64,
	organizationID int64,
) (*OrganizationPayments, error) {
	if organizationID <= 0 {
		return nil, ErrInvalidRequest
	}
	return s.repo.ListOrganizationPayments(ctx, userID, organizationID)
}

func IsNotFound(err error) bool {
	return errors.Is(err, ErrNotFound)
}
