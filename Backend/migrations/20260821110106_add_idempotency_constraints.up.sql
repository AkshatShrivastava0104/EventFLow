-- =========================================================
-- 1. One active registration per user per event
-- =========================================================

CREATE UNIQUE INDEX IF NOT EXISTS
idx_registrations_active_user_event
ON registrations (user_id, event_id)
WHERE status <> 'cancelled';


-- =========================================================
-- 2. One waitlist entry per user per event
-- =========================================================

CREATE UNIQUE INDEX IF NOT EXISTS
idx_waitlist_user_event
ON waitlist (user_id, event_id);


-- =========================================================
-- 3. One ticket per registration
-- =========================================================

CREATE UNIQUE INDEX IF NOT EXISTS
idx_tickets_registration
ON tickets (registration_id);


-- =========================================================
-- 4. One check-in per ticket
-- =========================================================

CREATE UNIQUE INDEX IF NOT EXISTS
idx_checkins_ticket
ON checkins (ticket_id);