package organization

import (
	"context"
	"errors"
	"testing"
)

func TestCreateOrganizationRequiresPaidPlanCheckout(t *testing.T) {
	service := &Service{}

	organizationID, err := service.CreateOrganization(
		context.Background(),
		"Community",
		"",
		12,
	)
	if !errors.Is(err, ErrPaidPlanRequired) {
		t.Fatalf("CreateOrganization error = %v, want %v", err, ErrPaidPlanRequired)
	}
	if organizationID != 0 {
		t.Fatalf("CreateOrganization id = %d, want 0", organizationID)
	}
}
