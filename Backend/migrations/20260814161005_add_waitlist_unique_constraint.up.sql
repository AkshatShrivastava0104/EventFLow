CREATE UNIQUE INDEX IF NOT EXISTS
idx_waitlist_user_event
ON waitlist(user_id, event_id);