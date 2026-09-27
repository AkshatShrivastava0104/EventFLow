package registration

import "testing"

func TestRegistrationStatusForPayment(t *testing.T) {
	tests := []struct {
		name                   string
		price                  float64
		paymentCompleted       bool
		wantRegistrationStatus string
		wantPaymentStatus      string
	}{
		{
			name:                   "free event does not require payment",
			price:                  0,
			wantRegistrationStatus: "registered",
			wantPaymentStatus:      "unpaid",
		},
		{
			name:                   "paid event awaits payment",
			price:                  25,
			wantRegistrationStatus: "pending",
			wantPaymentStatus:      "unpaid",
		},
		{
			name:                   "paid event registers after payment",
			price:                  25,
			paymentCompleted:       true,
			wantRegistrationStatus: "registered",
			wantPaymentStatus:      "paid",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			registrationStatus, paymentStatus := registrationStatusForPayment(
				test.price,
				test.paymentCompleted,
			)

			if registrationStatus != test.wantRegistrationStatus {
				t.Errorf("registration status = %q, want %q", registrationStatus, test.wantRegistrationStatus)
			}

			if paymentStatus != test.wantPaymentStatus {
				t.Errorf("payment status = %q, want %q", paymentStatus, test.wantPaymentStatus)
			}
		})
	}
}
