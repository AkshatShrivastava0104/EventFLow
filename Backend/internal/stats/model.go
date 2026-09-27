package stats

import "time"

// PlatformStats contains platform-wide metrics.
// Only PLATFORM_OWNER should be allowed to access these stats.
type PlatformStats struct {
	Users             int64   `json:"users"`
	Organizations     int64   `json:"organizations"`
	ActiveOrganizations int64 `json:"active_organizations"`
	Events            int64   `json:"events"`
	PublishedEvents   int64   `json:"published_events"`
	DraftEvents       int64   `json:"draft_events"`
	CancelledEvents   int64   `json:"cancelled_events"`
	CompletedEvents   int64   `json:"completed_events"`
	Registrations     int64   `json:"registrations"`
	ActiveRegistrations int64 `json:"active_registrations"`
	Tickets           int64   `json:"tickets"`
	CheckIns          int64   `json:"check_ins"`
	AttendanceRate    float64 `json:"attendance_rate"`

	UsersThisMonth         int64 `json:"users_this_month"`
	OrganizationsThisMonth int64 `json:"organizations_this_month"`
	EventsThisMonth        int64 `json:"events_this_month"`
	RegistrationsThisMonth int64 `json:"registrations_this_month"`

	Monthly []MonthlyStats `json:"monthly"`
	TopOrganizations []TopOrganization `json:"top_organizations"`
	TopEvents []TopEvent `json:"top_events"`
}

// OrganizationStats contains statistics for one organization.
type OrganizationStats struct {
	OrganizationID int64  `json:"organization_id"`
	OrganizationName string `json:"organization_name"`

	Events              int64 `json:"events"`
	UpcomingEvents      int64 `json:"upcoming_events"`
	PublishedEvents     int64 `json:"published_events"`
	DraftEvents         int64 `json:"draft_events"`
	CancelledEvents     int64 `json:"cancelled_events"`
	CompletedEvents     int64 `json:"completed_events"`

	Registrations       int64 `json:"registrations"`
	ActiveRegistrations int64 `json:"active_registrations"`
	Tickets             int64 `json:"tickets"`
	CheckIns            int64 `json:"check_ins"`
	AttendanceRate      float64 `json:"attendance_rate"`

	Members int64 `json:"members"`
	Admins  int64 `json:"admins"`
	Staff   int64 `json:"staff"`

	RegistrationsThisMonth int64 `json:"registrations_this_month"`
	EventsThisMonth        int64 `json:"events_this_month"`

	Monthly []MonthlyStats `json:"monthly"`
	TopEvents []TopEvent `json:"top_events"`
	Upcoming []UpcomingEvent `json:"upcoming"`
}

// StaffStats contains operational statistics for organization staff.
type StaffStats struct {
	OrganizationID   int64 `json:"organization_id"`
	TodayEvents      int64 `json:"today_events"`
	UpcomingEvents   int64 `json:"upcoming_events"`
	ExpectedAttendees int64 `json:"expected_attendees"`
	CheckInsToday    int64 `json:"check_ins_today"`
	PendingCheckIns  int64 `json:"pending_check_ins"`

	TodayEventsList []UpcomingEvent `json:"today_events_list"`
}

// MonthlyStats represents one month's platform/organization activity.
type MonthlyStats struct {
	Month         string `json:"month"`
	Users         int64 `json:"users"`
	Organizations int64 `json:"organizations"`
	Events        int64 `json:"events"`
	Registrations int64 `json:"registrations"`
	CheckIns      int64 `json:"check_ins"`
}

// TopOrganization represents an organization ranked by activity.
// The ordering will be produced by the database query.
type TopOrganization struct {
	ID            int64  `json:"id"`
	Name          string `json:"name"`
	Events        int64  `json:"events"`
	Registrations int64  `json:"registrations"`
	Members       int64  `json:"members"`
}

// TopEvent represents an event ranked by registrations.
type TopEvent struct {
	ID            int64     `json:"id"`
	OrganizationID int64    `json:"organization_id"`
	Title         string    `json:"title"`
	Status        string    `json:"status"`
	StartTime     time.Time `json:"start_time"`
	Capacity      *int      `json:"capacity,omitempty"`
	Registrations int64     `json:"registrations"`
	CheckIns      int64     `json:"check_ins"`
	AttendanceRate float64  `json:"attendance_rate"`
}

// UpcomingEvent represents an upcoming operational event.
type UpcomingEvent struct {
	ID             int64     `json:"id"`
	Title          string    `json:"title"`
	Status         string    `json:"status"`
	StartTime      time.Time `json:"start_time"`
	EndTime        time.Time `json:"end_time"`
	Venue          string    `json:"venue"`
	Capacity       *int      `json:"capacity,omitempty"`
	Registrations  int64     `json:"registrations"`
	CheckIns       int64     `json:"check_ins"`
}