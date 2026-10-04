package payment

import "time"

const GrowthMonthlyPrice = 6499.00

type CreateIntentRequest struct {
	Purpose          string `json:"purpose"`
	EventID          int64  `json:"event_id"`
	Quantity         int    `json:"quantity"`
	OrganizationName string `json:"organization_name"`
}

type Intent struct {
	OrderID  string  `json:"order_id"`
	Amount   float64 `json:"amount"`
	Currency string  `json:"currency"`
	Purpose  string  `json:"purpose"`
}

type Confirmation struct {
	PaymentID      string `json:"payment_id,omitempty"`
	Status         string `json:"status"`
	RegistrationID *int64 `json:"registration_id,omitempty"`
	OrganizationID *int64 `json:"organization_id,omitempty"`
}

type Payment struct {
	ID             int64      `json:"id"`
	OrderID        string     `json:"order_id"`
	PaymentID      *string    `json:"payment_id,omitempty"`
	UserID         int64      `json:"user_id"`
	UserName       string     `json:"user_name"`
	UserEmail      string     `json:"user_email"`
	EventID        *int64     `json:"event_id,omitempty"`
	EventTitle     string     `json:"event_title,omitempty"`
	RegistrationID *int64     `json:"registration_id,omitempty"`
	Amount         float64    `json:"amount"`
	Currency       string     `json:"currency"`
	Status         string     `json:"status"`
	Purpose        string     `json:"purpose"`
	CreatedAt      time.Time  `json:"created_at"`
	ConfirmedAt    *time.Time `json:"confirmed_at,omitempty"`
}

type MonthlyRevenue struct {
	Month   string  `json:"month"`
	Revenue float64 `json:"revenue"`
}

type OrganizationPayments struct {
	Payments       []Payment        `json:"payments"`
	Revenue        float64          `json:"revenue"`
	MonthlyRevenue []MonthlyRevenue `json:"monthly_revenue"`
}
