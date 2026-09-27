ALTER TABLE registrations
ALTER COLUMN status SET DEFAULT 'pending';

UPDATE registrations AS registration
SET status = 'registered'
FROM events AS event
WHERE event.id = registration.event_id
  AND COALESCE(event.price, 0) <= 0
  AND registration.status = 'pending'
  AND registration.payment_status IN ('unpaid', 'free');