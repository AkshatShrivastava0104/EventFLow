package monitoring

import "time"

type ActivityLog struct {
	ID           int64     `json:"id"`
	UserID       *int64    `json:"user_id,omitempty"`
	UserName     string    `json:"user_name"`
	UserEmail    string    `json:"user_email"`
	Action       string    `json:"action"`
	EntityType   string    `json:"entity_type"`
	EntityID     *int64    `json:"entity_id,omitempty"`
	Description  string    `json:"description"`
	IPAddress    string    `json:"ip_address"`
	CreatedAt    time.Time `json:"created_at"`
}

type PlatformTicket struct {
	ID             int64      `json:"id"`
	TicketNumber   string     `json:"ticket_number"`
	QRCode         string     `json:"qr_code,omitempty"`
	RegistrationID int64      `json:"registration_id"`
	UserID         int64      `json:"user_id"`
	UserName       string     `json:"user_name"`
	UserEmail      string     `json:"user_email"`
	EventID        int64      `json:"event_id"`
	EventTitle     string     `json:"event_title"`
	OrganizationID int64      `json:"organization_id"`
	OrganizationName string   `json:"organization_name"`
	RegistrationStatus string `json:"registration_status"`
	PaymentStatus  string     `json:"payment_status"`
	CheckinStatus  string     `json:"checkin_status"`
	CheckedInAt    *time.Time `json:"checked_in_at,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
}

type SystemHealth struct {
	Status      string          `json:"status"`
	Timestamp   time.Time       `json:"timestamp"`
	Uptime      string          `json:"uptime"`
	Database    ComponentHealth `json:"database"`
	Redis       ComponentHealth `json:"redis"`
}

type ComponentHealth struct {
	Status    string `json:"status"`
	Message   string `json:"message,omitempty"`
	LatencyMs int64  `json:"latency_ms,omitempty"`
}

type Pagination struct {
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

type PaginatedActivityLogs struct {
	Logs       []ActivityLog `json:"logs"`
	Pagination Pagination    `json:"pagination"`
}

type PaginatedPlatformTickets struct {
	Tickets    []PlatformTicket `json:"tickets"`
	Pagination Pagination        `json:"pagination"`
}