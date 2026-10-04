package payment

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestCreateIntentHandlerRequiresAuthentication(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler := NewHandler(NewService(&paymentRepositoryStub{}))
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(http.MethodPost, "/payments/intents", bytes.NewBufferString(`{"event_id":42}`))

	handler.CreateIntent(context)

	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d; body=%s", recorder.Code, http.StatusUnauthorized, recorder.Body.String())
	}
}

func TestCreateIntentHandlerReturnsINRIntent(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &paymentRepositoryStub{}
	handler := NewHandler(NewService(repo))
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(
		http.MethodPost,
		"/payments/intents",
		bytes.NewBufferString(`{"purpose":"event","event_id":42,"quantity":2}`),
	)
	context.Request.Header.Set("Content-Type", "application/json")
	context.Set("user_id", int64(7))

	handler.CreateIntent(context)

	if recorder.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d; body=%s", recorder.Code, http.StatusCreated, recorder.Body.String())
	}
	var response Intent
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if response.Currency != "INR" || response.OrderID != "ord_test" {
		t.Fatalf("unexpected intent response: %+v", response)
	}
	if repo.eventUserID != 7 || repo.eventID != 42 || repo.quantity != 2 {
		t.Fatalf("unexpected repository call: %+v", repo)
	}
}

func TestConfirmHandlerMapsSandboxDecline(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &paymentRepositoryStub{}
	handler := NewHandler(NewService(repo))
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(
		http.MethodPost,
		"/payments/intents/ord_test/confirm",
		bytes.NewBufferString(`{"test_card_last_four":"0002"}`),
	)
	context.Request.Header.Set("Content-Type", "application/json")
	context.Params = gin.Params{{Key: "order_id", Value: "ord_test"}}
	context.Set("user_id", int64(7))

	handler.Confirm(context)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d; body=%s", recorder.Code, http.StatusOK, recorder.Body.String())
	}
	var response Confirmation
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if response.Status != "failed" || repo.confirmSucceeded {
		t.Fatalf("response=%+v succeeded=%t", response, repo.confirmSucceeded)
	}
}
