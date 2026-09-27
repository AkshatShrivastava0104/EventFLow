package organization

type UpdateOrganizationRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}


type AddMemberRequest struct {
	UserID int64  `json:"user_id" binding:"required"`
	Role   string `json:"role" binding:"required"`
}