package registration

type CreateRegistrationRequest struct {
	EventID int64 `json:"event_id" binding:"required"`
}