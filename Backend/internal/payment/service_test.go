package payment

import (
	"context"
	"errors"
	"testing"
)

type paymentRepositoryStub struct {
	eventUserID        int64
	eventID            int64
	quantity           int
	subscriptionUserID int64
	subscriptionPlan   string
	organizationName   string
	confirmedUserID    int64
	confirmedOrderID   string
	confirmSucceeded   bool
	listUserID         int64
	listOrganizationID int64
	calls              int
}

func (s *paymentRepositoryStub) CreateEventIntent(
	_ context.Context,
	userID, eventID int64,
	quantity int,
) (*Intent, error) {
	s.calls++
	s.eventUserID, s.eventID, s.quantity = userID, eventID, quantity
	return &Intent{OrderID: "ord_test", Amount: 100, Currency: "INR", Purpose: "event"}, nil
}

func (s *paymentRepositoryStub) CreateSubscriptionIntent(
	_ context.Context,
	userID int64,
	plan string,
	name string,
) (*Intent, error) {
	s.calls++
	s.subscriptionUserID, s.subscriptionPlan, s.organizationName = userID, plan, name
	price := ProMonthlyPrice
	if plan == "plus" {
		price = PlusMonthlyPrice
	}
	return &Intent{OrderID: "ord_subscription", Amount: price, Currency: "INR", Purpose: "subscription"}, nil
}

func (s *paymentRepositoryStub) Confirm(
	_ context.Context,
	userID int64,
	orderID string,
	succeeded bool,
) (*Confirmation, error) {
	s.calls++
	s.confirmedUserID, s.confirmedOrderID, s.confirmSucceeded = userID, orderID, succeeded
	return &Confirmation{Status: map[bool]string{true: "succeeded", false: "failed"}[succeeded]}, nil
}

func (s *paymentRepositoryStub) ListOrganizationPayments(
	_ context.Context,
	userID, organizationID int64,
) (*OrganizationPayments, error) {
	s.calls++
	s.listUserID, s.listOrganizationID = userID, organizationID
	return &OrganizationPayments{Payments: []Payment{}, MonthlyRevenue: []MonthlyRevenue{}}, nil
}

func TestCreateIntentEventValidationAndDefaults(t *testing.T) {
	ctx := context.Background()
	repo := &paymentRepositoryStub{}
	service := NewService(repo)

	_, err := service.CreateIntent(ctx, 7, CreateIntentRequest{})
	if !errors.Is(err, ErrInvalidRequest) {
		t.Fatalf("CreateIntent missing event error = %v, want %v", err, ErrInvalidRequest)
	}
	if repo.calls != 0 {
		t.Fatal("repository called for invalid event intent")
	}

	intent, err := service.CreateIntent(ctx, 7, CreateIntentRequest{
		Purpose: " EVENT ",
		EventID: 42,
	})
	if err != nil {
		t.Fatalf("CreateIntent returned error: %v", err)
	}
	if intent.Currency != "INR" || intent.Purpose != "event" {
		t.Fatalf("unexpected event intent: %+v", intent)
	}
	if repo.eventUserID != 7 || repo.eventID != 42 || repo.quantity != 1 {
		t.Fatalf("repository received user=%d event=%d quantity=%d", repo.eventUserID, repo.eventID, repo.quantity)
	}
}

func TestCreateIntentRejectsInvalidQuantity(t *testing.T) {
	for _, quantity := range []int{-1, 11} {
		repo := &paymentRepositoryStub{}
		service := NewService(repo)
		_, err := service.CreateIntent(context.Background(), 7, CreateIntentRequest{
			EventID: 42, Quantity: quantity,
		})
		if !errors.Is(err, ErrInvalidRequest) {
			t.Errorf("quantity %d error = %v, want %v", quantity, err, ErrInvalidRequest)
		}
		if repo.calls != 0 {
			t.Errorf("repository called for quantity %d", quantity)
		}
	}
}

func TestCreateIntentSubscriptionValidation(t *testing.T) {
	repo := &paymentRepositoryStub{}
	service := NewService(repo)

	intent, err := service.CreateIntent(context.Background(), 8, CreateIntentRequest{
		Purpose:          "subscription",
		Plan:             "plus",
		OrganizationName: "  EventFlow Test Org  ",
	})
	if err != nil {
		t.Fatalf("CreateIntent subscription returned error: %v", err)
	}
	if intent.Amount != PlusMonthlyPrice || intent.Currency != "INR" {
		t.Fatalf("unexpected Plus subscription intent: %+v", intent)
	}
	if repo.subscriptionUserID != 8 || repo.subscriptionPlan != "plus" || repo.organizationName != "EventFlow Test Org" {
		t.Fatalf("repository received user=%d plan=%q organization=%q", repo.subscriptionUserID, repo.subscriptionPlan, repo.organizationName)
	}

	proIntent, err := service.CreateIntent(context.Background(), 9, CreateIntentRequest{
		Purpose:          "subscription",
		Plan:             " PRO ",
		OrganizationName: "Pro Test Workspace",
	})
	if err != nil || proIntent.Amount != ProMonthlyPrice || repo.subscriptionPlan != "pro" {
		t.Fatalf("unexpected Pro subscription intent: intent=%+v plan=%q error=%v", proIntent, repo.subscriptionPlan, err)
	}

	for _, request := range []CreateIntentRequest{
		{Purpose: "subscription"},
		{Purpose: "subscription", OrganizationName: "Valid", Quantity: 2},
		{Purpose: "subscription", Plan: "starter", OrganizationName: "Valid"},
		{Purpose: "other", EventID: 42},
	} {
		before := repo.calls
		_, err := service.CreateIntent(context.Background(), 8, request)
		if !errors.Is(err, ErrInvalidRequest) {
			t.Errorf("request %+v error = %v, want %v", request, err, ErrInvalidRequest)
		}
		if repo.calls != before {
			t.Errorf("repository called for invalid request %+v", request)
		}
	}
}

func TestConfirmMapsSandboxCardsAndRejectsInvalidInput(t *testing.T) {
	repo := &paymentRepositoryStub{}
	service := NewService(repo)

	for _, test := range []struct {
		card    string
		succeed bool
	}{
		{card: "4242", succeed: true},
		{card: "0002", succeed: false},
		{card: "1234", succeed: false},
	} {
		result, err := service.Confirm(context.Background(), 9, "ord_test", test.card)
		if err != nil {
			t.Fatalf("Confirm card %s returned error: %v", test.card, err)
		}
		if repo.confirmSucceeded != test.succeed {
			t.Errorf("Confirm card %s succeeded=%t, want %t", test.card, repo.confirmSucceeded, test.succeed)
		}
		wantStatus := "failed"
		if test.succeed {
			wantStatus = "succeeded"
		}
		if result.Status != wantStatus {
			t.Errorf("Confirm card %s status = %q, want %q", test.card, result.Status, wantStatus)
		}
	}
	before := repo.calls
	for _, test := range []struct{ order, card string }{
		{order: "", card: "4242"},
		{order: "ord_test", card: "42"},
		{order: "ord_test", card: "42424"},
		{order: "ord_test", card: "abcd"},
	} {
		_, err := service.Confirm(context.Background(), 9, test.order, test.card)
		if !errors.Is(err, ErrInvalidRequest) {
			t.Errorf("Confirm order=%q card=%q error = %v, want %v", test.order, test.card, err, ErrInvalidRequest)
		}
	}
	if repo.calls != before {
		t.Fatal("repository called for invalid confirmation")
	}
}

func TestListOrganizationPaymentsValidatesIDAndForwardsIdentity(t *testing.T) {
	repo := &paymentRepositoryStub{}
	service := NewService(repo)

	_, err := service.ListOrganizationPayments(context.Background(), 3, 0)
	if !errors.Is(err, ErrInvalidRequest) {
		t.Fatalf("ListOrganizationPayments error = %v, want %v", err, ErrInvalidRequest)
	}
	if repo.calls != 0 {
		t.Fatal("repository called for invalid organization id")
	}

	_, err = service.ListOrganizationPayments(context.Background(), 3, 12)
	if err != nil {
		t.Fatalf("ListOrganizationPayments returned error: %v", err)
	}
	if repo.listUserID != 3 || repo.listOrganizationID != 12 {
		t.Fatalf("repository received user=%d organization=%d", repo.listUserID, repo.listOrganizationID)
	}
}

func TestQuantityRange(t *testing.T) {
	for _, test := range []struct {
		quantity int
		valid    bool
	}{
		{quantity: 0, valid: false},
		{quantity: 1, valid: true},
		{quantity: 10, valid: true},
		{quantity: 11, valid: false},
	} {
		if got := isValidQuantity(test.quantity); got != test.valid {
			t.Errorf("isValidQuantity(%d) = %t, want %t", test.quantity, got, test.valid)
		}
	}
}
