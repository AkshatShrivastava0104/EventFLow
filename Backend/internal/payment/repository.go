package payment

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrInvalidRequest = errors.New("invalid payment request")
	ErrNotFound       = errors.New("payment not found")
	ErrForbidden      = errors.New("forbidden")
	ErrNotEligible    = errors.New("user is not eligible for organizer subscription")
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) CreateEventIntent(
	ctx context.Context,
	userID int64,
	eventID int64,
	quantity int,
) (*Intent, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var price float64
	var status string

	err := r.db.QueryRow(ctx, `
		SELECT COALESCE(price, 0), status
		FROM events
		WHERE id = $1
	`, eventID).Scan(&price, &status)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	if status != "published" || price <= 0 {
		return nil, ErrInvalidRequest
	}

	return r.insertIntent(ctx, userID, "event", eventID, quantity, price*float64(quantity), "")
}

func (r *Repository) CreateSubscriptionIntent(
	ctx context.Context,
	userID int64,
	organizationName string,
) (*Intent, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var hasOrganization bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM organization_members
			WHERE user_id = $1
		)
	`, userID).Scan(&hasOrganization)
	if err != nil {
		return nil, err
	}
	if hasOrganization {
		return nil, ErrNotEligible
	}

	return r.insertIntent(ctx, userID, "subscription", 0, 1, GrowthMonthlyPrice, organizationName)
}

func (r *Repository) insertIntent(
	ctx context.Context,
	userID int64,
	purpose string,
	eventID int64,
	quantity int,
	amount float64,
	organizationName string,
) (*Intent, error) {
	orderID, err := newIdentifier("ord_")
	if err != nil {
		return nil, err
	}

	_, err = r.db.Exec(ctx, `
		INSERT INTO payments (
			order_id, user_id, event_id, purpose, plan,
			organization_name, quantity, amount, currency, status
		)
		VALUES (
			$1, $2, NULLIF($3, 0), $4,
			CASE WHEN $4 = 'subscription' THEN 'growth' ELSE NULL END,
			NULLIF($5, ''), $6, $7, 'INR', 'pending'
		)
	`, orderID, userID, eventID, purpose, organizationName, quantity, amount)
	if err != nil {
		return nil, err
	}

	return &Intent{
		OrderID:  orderID,
		Amount:   amount,
		Currency: "INR",
		Purpose:  purpose,
	}, nil
}

func (r *Repository) Confirm(
	ctx context.Context,
	userID int64,
	orderID string,
	succeeded bool,
) (*Confirmation, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var (
		paymentRowID      int64
		purpose           string
		status            string
		organizationName  string
		organizationID    *int64
		registrationID    *int64
		existingPaymentID sql.NullString
	)
	err = tx.QueryRow(ctx, `
		SELECT id, purpose, status, COALESCE(organization_name, ''),
			organization_id, registration_id, payment_id
		FROM payments
		WHERE order_id = $1 AND user_id = $2
		FOR UPDATE
	`, orderID, userID).Scan(
		&paymentRowID,
		&purpose,
		&status,
		&organizationName,
		&organizationID,
		&registrationID,
		&existingPaymentID,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	if status == "succeeded" {
		result := &Confirmation{
			Status:         "succeeded",
			OrganizationID: organizationID,
			RegistrationID: registrationID,
		}
		if existingPaymentID.Valid {
			result.PaymentID = existingPaymentID.String
		} else {
			return nil, errors.New("successful payment is missing its payment id")
		}
		if err := tx.Commit(ctx); err != nil {
			return nil, err
		}
		return result, nil
	}
	if status == "failed" {
		return &Confirmation{Status: "failed"}, tx.Commit(ctx)
	}

	if !succeeded {
		_, err = tx.Exec(ctx, `
			UPDATE payments
			SET status = 'failed', updated_at = NOW(), confirmed_at = NOW()
			WHERE id = $1
		`, paymentRowID)
		if err != nil {
			return nil, err
		}
		if err := tx.Commit(ctx); err != nil {
			return nil, err
		}
		return &Confirmation{Status: "failed"}, nil
	}

	paymentID, err := newIdentifier("pay_")
	if err != nil {
		return nil, err
	}
	result := &Confirmation{PaymentID: paymentID, Status: "succeeded"}

	if purpose == "subscription" {
		var lockedUserID int64
		err = tx.QueryRow(ctx, `SELECT id FROM users WHERE id = $1 FOR UPDATE`, userID).Scan(&lockedUserID)
		if err != nil {
			return nil, err
		}
		var alreadyMember bool
		err = tx.QueryRow(ctx, `
			SELECT EXISTS (
				SELECT 1 FROM organization_members WHERE user_id = $1
			)
		`, userID).Scan(&alreadyMember)
		if err != nil {
			return nil, err
		}
		if alreadyMember {
			return nil, ErrNotEligible
		}

		err = tx.QueryRow(ctx, `
			INSERT INTO organizations (
				owner_id, name, description, subscription_plan,
				subscription_status, subscription_period_end, created_at, updated_at
			)
			VALUES ($1, $2, '', 'growth', 'active', NOW() + INTERVAL '1 month', NOW(), NOW())
			RETURNING id
		`, userID, organizationName).Scan(&result.OrganizationID)
		if err != nil {
			return nil, err
		}

		_, err = tx.Exec(ctx, `
			INSERT INTO organization_members (organization_id, user_id, role, joined_at)
			VALUES ($1, $2, 'ADMIN', NOW())
		`, *result.OrganizationID, userID)
		if err != nil {
			return nil, err
		}
	}

	_, err = tx.Exec(ctx, `
		UPDATE payments
		SET status = 'succeeded',
			payment_id = $2,
			organization_id = $3,
			updated_at = NOW(),
			confirmed_at = NOW()
		WHERE id = $1
	`, paymentRowID, paymentID, result.OrganizationID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return result, nil
}

func (r *Repository) ListOrganizationPayments(
	ctx context.Context,
	userID int64,
	organizationID int64,
) (*OrganizationPayments, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	var isAdmin bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM organization_members
			WHERE organization_id = $1 AND user_id = $2 AND role = 'ADMIN'
		)
	`, organizationID, userID).Scan(&isAdmin)
	if err != nil {
		return nil, fmt.Errorf("check organization admin membership: %w", err)
	}
	if !isAdmin {
		return nil, ErrForbidden
	}

	result := &OrganizationPayments{
		Payments:       make([]Payment, 0),
		MonthlyRevenue: make([]MonthlyRevenue, 0, 12),
	}

	err = r.db.QueryRow(ctx, `
		SELECT COALESCE(SUM(p.amount), 0)
		FROM payments p
		JOIN events e ON e.id = p.event_id
		WHERE e.organization_id = $1
		  AND p.purpose = 'event'
		  AND p.status = 'succeeded'
		  AND p.registration_id IS NOT NULL
	`, organizationID).Scan(&result.Revenue)
	if err != nil {
		return nil, fmt.Errorf("query organization payment revenue: %w", err)
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			TO_CHAR(months.month_start, 'Mon YYYY'),
			COALESCE(SUM(p.amount), 0)
		FROM generate_series(
			date_trunc('month', NOW()) - INTERVAL '11 months',
			date_trunc('month', NOW()),
			INTERVAL '1 month'
		) AS months(month_start)
		LEFT JOIN events e ON e.organization_id = $1
		LEFT JOIN payments p
			ON p.event_id = e.id
			AND p.purpose = 'event'
			AND p.status = 'succeeded'
			AND p.registration_id IS NOT NULL
			AND p.confirmed_at >= months.month_start
			AND p.confirmed_at < months.month_start + INTERVAL '1 month'
		GROUP BY months.month_start
		ORDER BY months.month_start
	`, organizationID)
	if err != nil {
		return nil, fmt.Errorf("query monthly organization revenue: %w", err)
	}
	for rows.Next() {
		var item MonthlyRevenue
		if err := rows.Scan(&item.Month, &item.Revenue); err != nil {
			rows.Close()
			return nil, fmt.Errorf("scan monthly organization revenue: %w", err)
		}
		result.MonthlyRevenue = append(result.MonthlyRevenue, item)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return nil, fmt.Errorf("iterate monthly organization revenue: %w", err)
	}
	rows.Close()

	paymentRows, err := r.db.Query(ctx, `
		SELECT p.id, p.order_id, p.payment_id, p.user_id,
			COALESCE(u.name, ''), COALESCE(u.email, ''),
			p.event_id, COALESCE(e.title, ''),
			p.registration_id, p.amount, p.currency, p.status,
			p.purpose, p.created_at, p.confirmed_at
		FROM payments p
		JOIN users u ON u.id = p.user_id
		LEFT JOIN events e ON e.id = p.event_id
		WHERE p.purpose = 'event'
		  AND e.organization_id = $1
		ORDER BY p.created_at DESC
	`, organizationID)
	if err != nil {
		return nil, fmt.Errorf("query organization payment list: %w", err)
	}
	defer paymentRows.Close()

	for paymentRows.Next() {
		var item Payment
		var paymentID, eventTitle sql.NullString
		var eventID, registrationID sql.NullInt64
		var confirmedAt sql.NullTime
		if err := paymentRows.Scan(
			&item.ID,
			&item.OrderID,
			&paymentID,
			&item.UserID,
			&item.UserName,
			&item.UserEmail,
			&eventID,
			&eventTitle,
			&registrationID,
			&item.Amount,
			&item.Currency,
			&item.Status,
			&item.Purpose,
			&item.CreatedAt,
			&confirmedAt,
		); err != nil {
			return nil, fmt.Errorf("scan organization payment: %w", err)
		}
		if paymentID.Valid {
			item.PaymentID = &paymentID.String
		}
		if eventID.Valid {
			item.EventID = &eventID.Int64
		}
		if registrationID.Valid {
			item.RegistrationID = &registrationID.Int64
		}
		if confirmedAt.Valid {
			item.ConfirmedAt = &confirmedAt.Time
		}
		if eventTitle.Valid {
			item.EventTitle = eventTitle.String
		}
		result.Payments = append(result.Payments, item)
	}
	if err := paymentRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate organization payment list: %w", err)
	}
	return result, nil
}

func newIdentifier(prefix string) (string, error) {
	value := make([]byte, 16)
	if _, err := rand.Read(value); err != nil {
		return "", err
	}
	return prefix + hex.EncodeToString(value), nil
}

func validateOrganizationName(name string) (string, error) {
	name = strings.TrimSpace(name)
	if name == "" || len(name) > 100 {
		return "", ErrInvalidRequest
	}
	return name, nil
}

func isValidQuantity(quantity int) bool {
	return quantity >= 1 && quantity <= 10
}
