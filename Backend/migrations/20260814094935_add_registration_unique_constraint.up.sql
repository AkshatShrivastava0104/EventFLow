CREATE UNIQUE INDEX IF NOT EXISTS
idx_registrations_user_event
ON registrations(user_id, event_id);