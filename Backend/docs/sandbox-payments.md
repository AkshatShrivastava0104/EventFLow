# Sandbox payments

EventFlow's payment API is a local simulation; it does not connect to a processor or move money. Amounts are calculated by the backend and stored in INR. Card data is not stored: the confirmation endpoint receives only the last four test digits.

## Event checkout

1. Create an intent with the authenticated user's token:

   ```http
   POST /api/v1/payments/intents
   Content-Type: application/json

   {"purpose":"event","event_id":42,"quantity":1}
   ```

   The backend reads the published event price and returns an INR amount and unique `order_id`. Quantity must be between 1 and 10.

2. Confirm the intent:

   ```http
   POST /api/v1/payments/intents/{order_id}/confirm
   Content-Type: application/json

   {"test_card_last_four":"4242"}
   ```

   `4242` succeeds. `0002` simulates a decline; other four-digit values also decline.

3. On success, create the registration with the returned `payment_id`:

   ```http
   POST /api/v1/events/42/register
   Content-Type: application/json

   {"payment_id":"pay_...","quantity":1}
   ```

   The registration and tickets are created together only after the backend validates that the successful payment belongs to this user and event and covers the exact amount and quantity.

## Organizer plans

Organizer workspaces require one of two paid plans: Pro costs ₹999 per month and Plus costs ₹2,499 per month. The sandbox simulates the first payment only and does not auto-renew or move money. Create a subscription intent with `purpose: "subscription"`, `plan: "pro"` or `"plus"`, and `organization_name`, for example `{"purpose":"subscription","plan":"pro","organization_name":"Bengaluru Tech Community"}`. A successful confirmation creates the organization with its selected plan and `ADMIN` membership in the same transaction. A declined payment grants no organizer access. Direct `POST /api/v1/organizations` requests cannot create a free workspace.

Apply all database migrations, including `20261004190000_create_payments_table` and `20261008180000_replace_starter_growth_plans`, before deploying the API. The payment migration creates the tables required by checkout and revenue reporting; the newer migration updates the supported subscription plan values.

## Admin payments and revenue

`GET /api/v1/organizations/{organization_id}/payments` returns that organization's event-payment attempts, payer details, captured ticket revenue, and the monthly revenue series. Only organization admins can access it. Revenue includes successful payments after registration and ticket creation, not abandoned or failed attempts.
