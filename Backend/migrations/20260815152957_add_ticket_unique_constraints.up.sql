CREATE UNIQUE INDEX IF NOT EXISTS
idx_tickets_registration_id
ON tickets(registration_id);

CREATE UNIQUE INDEX IF NOT EXISTS
idx_tickets_ticket_number
ON tickets(ticket_number);