package payment

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/AkshatShrivastava0104/EventFlow/internal/outbox"
	"github.com/AkshatShrivastava0104/EventFlow/internal/registration"
	"github.com/jackc/pgx/v5/pgxpool"
)

func TestPaymentAndGrowthSubscriptionDatabaseFlow(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "postgres://postgres:postgres@localhost:5432/eventflow_test?sslmode=disable"
	}
	db, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Skipf("payment integration test requires PostgreSQL: %v", err)
	}
	defer db.Close()
	if err := db.Ping(ctx); err != nil {
		t.Skipf("payment integration test requires PostgreSQL: %v", err)
	}
	var registrationTicketUniqueIndex bool
	err = db.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM pg_indexes
			WHERE schemaname = current_schema()
			  AND tablename = 'tickets'
			  AND indexdef ILIKE 'CREATE UNIQUE INDEX% (registration_id)'
		)
	`).Scan(&registrationTicketUniqueIndex)
	if err != nil {
		t.Fatalf("inspect ticket indexes: %v", err)
	}
	if registrationTicketUniqueIndex {
		t.Fatal("tickets still have a unique index on registration_id; apply the latest migrations")
	}

	repo := NewRepository(db)
	payerID, organizationID, eventID := createPaymentFixture(t, ctx, db)

	eventIntent, err := repo.CreateEventIntent(ctx, payerID, eventID, 2)
	if err != nil {
		t.Fatalf("create paid-event intent: %v", err)
	}
	if eventIntent.Amount != 251 || eventIntent.Currency != "INR" {
		t.Fatalf("intent amount/currency = %.2f/%s, want 251.00/INR", eventIntent.Amount, eventIntent.Currency)
	}

	if _, err := repo.Confirm(ctx, payerID+1000000, eventIntent.OrderID, true); err != ErrNotFound {
		t.Fatalf("confirm with different user error = %v, want %v", err, ErrNotFound)
	}
	declined, err := repo.Confirm(ctx, payerID, eventIntent.OrderID, false)
	if err != nil {
		t.Fatalf("confirm declined payment: %v", err)
	}
	if declined.Status != "failed" || declined.PaymentID != "" {
		t.Fatalf("declined confirmation = %+v", declined)
	}
	if _, err := repo.Confirm(ctx, payerID, eventIntent.OrderID, true); err != nil {
		t.Fatalf("declined order retry should be idempotently declined: %v", err)
	}

	eventIntent, err = repo.CreateEventIntent(ctx, payerID, eventID, 2)
	if err != nil {
		t.Fatalf("create successful event intent: %v", err)
	}
	confirmed, err := repo.Confirm(ctx, payerID, eventIntent.OrderID, true)
	if err != nil {
		t.Fatalf("confirm successful event payment: %v", err)
	}
	if confirmed.Status != "succeeded" || confirmed.PaymentID == "" {
		t.Fatalf("successful confirmation = %+v", confirmed)
	}
	repeatedConfirmation, err := repo.Confirm(ctx, payerID, eventIntent.OrderID, true)
	if err != nil {
		t.Fatalf("repeat successful confirmation: %v", err)
	}
	if repeatedConfirmation.PaymentID != confirmed.PaymentID {
		t.Fatalf("repeat confirmation payment id = %q, want %q", repeatedConfirmation.PaymentID, confirmed.PaymentID)
	}

	registrationRepo := registration.NewRepository(db, outbox.NewRepository(db))
	registered, err := registrationRepo.RegisterUser(ctx, eventID, payerID, confirmed.PaymentID, 2)
	if err != nil {
		t.Fatalf("register after successful payment: %v", err)
	}
	if registered.RegistrationID == nil || registered.Status != "registered" {
		t.Fatalf("registration result = %+v", registered)
	}
	retriedRegistration, err := registrationRepo.RegisterUser(ctx, eventID, payerID, confirmed.PaymentID, 2)
	if err != nil {
		t.Fatalf("retry registration after success: %v", err)
	}
	if retriedRegistration.RegistrationID == nil ||
		*retriedRegistration.RegistrationID != *registered.RegistrationID {
		t.Fatalf("retry result = %+v, initial = %+v", retriedRegistration, registered)
	}

	var ticketCount int
	err = db.QueryRow(ctx, `SELECT COUNT(*) FROM tickets WHERE registration_id = $1`, *registered.RegistrationID).Scan(&ticketCount)
	if err != nil {
		t.Fatalf("count generated tickets: %v", err)
	}
	if ticketCount != 2 {
		t.Fatalf("generated tickets = %d, want 2", ticketCount)
	}

	payments, err := repo.ListOrganizationPayments(ctx, payerID, organizationID)
	if err != nil {
		t.Fatalf("list organization payments: %v", err)
	}
	if payments.Revenue != 251 {
		t.Fatalf("captured revenue = %.2f, want 251.00", payments.Revenue)
	}
	if len(payments.MonthlyRevenue) != 12 {
		t.Fatalf("monthly revenue buckets = %d, want 12", len(payments.MonthlyRevenue))
	}
	if len(payments.Payments) != 2 {
		t.Fatalf("payment attempts = %d, want 2 (one declined, one successful)", len(payments.Payments))
	}
	if payments.Payments[0].Status != "succeeded" || payments.Payments[1].Status != "failed" {
		t.Fatalf("payment statuses = %q, %q; want succeeded, failed", payments.Payments[0].Status, payments.Payments[1].Status)
	}
	if _, err := repo.ListOrganizationPayments(ctx, payerID+1000000, organizationID); err != ErrForbidden {
		t.Fatalf("non-admin payment listing error = %v, want %v", err, ErrForbidden)
	}

	subscriberID := createPaymentUser(t, ctx, db, "growth")
	subscriptionIntent, err := repo.CreateSubscriptionIntent(ctx, subscriberID, "Growth Test Workspace")
	if err != nil {
		t.Fatalf("create Growth subscription intent: %v", err)
	}
	if subscriptionIntent.Amount != GrowthMonthlyPrice || subscriptionIntent.Currency != "INR" {
		t.Fatalf("subscription intent = %+v", subscriptionIntent)
	}
	subscription, err := repo.Confirm(ctx, subscriberID, subscriptionIntent.OrderID, true)
	if err != nil {
		t.Fatalf("confirm Growth subscription: %v", err)
	}
	if subscription.Status != "succeeded" || subscription.OrganizationID == nil {
		t.Fatalf("subscription confirmation = %+v", subscription)
	}
	var role, plan, status string
	err = db.QueryRow(ctx, `
		SELECT member.role, organization.subscription_plan, organization.subscription_status
		FROM organization_members member
		JOIN organizations organization ON organization.id = member.organization_id
		WHERE member.user_id = $1 AND organization.id = $2
	`, subscriberID, *subscription.OrganizationID).Scan(&role, &plan, &status)
	if err != nil {
		t.Fatalf("read Growth organization membership: %v", err)
	}
	if role != "ADMIN" || plan != "growth" || status != "active" {
		t.Fatalf("membership/plan/status = %s/%s/%s", role, plan, status)
	}
	replayedSubscription, err := repo.Confirm(ctx, subscriberID, subscriptionIntent.OrderID, true)
	if err != nil {
		t.Fatalf("repeat Growth subscription confirmation: %v", err)
	}
	if replayedSubscription.OrganizationID == nil ||
		*replayedSubscription.OrganizationID != *subscription.OrganizationID {
		t.Fatalf("repeat subscription confirmation = %+v", replayedSubscription)
	}
	if _, err := repo.CreateSubscriptionIntent(ctx, subscriberID, "Second Workspace"); err != ErrNotEligible {
		t.Fatalf("second Growth intent error = %v, want %v", err, ErrNotEligible)
	}
	t.Cleanup(func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cleanupCancel()
		_, _ = db.Exec(cleanupCtx, `DELETE FROM organizations WHERE id = $1`, *subscription.OrganizationID)
	})
}

func createPaymentFixture(
	t *testing.T,
	ctx context.Context,
	db *pgxpool.Pool,
) (int64, int64, int64) {
	t.Helper()
	payerID := createPaymentUser(t, ctx, db, "payer")
	var organizationID int64
	err := db.QueryRow(ctx, `
		INSERT INTO organizations (owner_id, name, description)
		VALUES ($1, $2, 'payment integration fixture')
		RETURNING id
	`, payerID, fmt.Sprintf("Payment Integration %d", time.Now().UnixNano())).Scan(&organizationID)
	if err != nil {
		t.Fatalf("create payment test organization: %v", err)
	}
	t.Cleanup(func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cleanupCancel()
		_, _ = db.Exec(cleanupCtx, `DELETE FROM organizations WHERE id = $1`, organizationID)
	})
	_, err = db.Exec(ctx, `
		INSERT INTO organization_members (organization_id, user_id, role)
		VALUES ($1, $2, 'ADMIN')
	`, organizationID, payerID)
	if err != nil {
		t.Fatalf("create organization admin membership: %v", err)
	}
	var eventID int64
	err = db.QueryRow(ctx, `
		INSERT INTO events (organization_id, title, capacity, status, price)
		VALUES ($1, 'Payment Integration Event', 10, 'published', 125.50)
		RETURNING id
	`, organizationID).Scan(&eventID)
	if err != nil {
		t.Fatalf("create paid event fixture: %v", err)
	}
	return payerID, organizationID, eventID
}

func createPaymentUser(
	t *testing.T,
	ctx context.Context,
	db *pgxpool.Pool,
	prefix string,
) int64 {
	t.Helper()
	var userID int64
	email := fmt.Sprintf("%s-%d@payment-test.invalid", prefix, time.Now().UnixNano())
	err := db.QueryRow(ctx, `
		INSERT INTO users (name, email, password_hash, role)
		VALUES ($1, $2, 'test-password-hash', 'user')
		RETURNING id
	`, prefix, email).Scan(&userID)
	if err != nil {
		t.Fatalf("create payment test user: %v", err)
	}
	t.Cleanup(func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cleanupCancel()
		_, _ = db.Exec(cleanupCtx, `DELETE FROM users WHERE id = $1`, userID)
	})
	return userID
}
