ALTER TABLE organizations
    DROP COLUMN IF EXISTS subscription_period_end,
    DROP COLUMN IF EXISTS subscription_status,
    DROP COLUMN IF EXISTS subscription_plan;

ALTER TABLE registrations
    DROP COLUMN IF EXISTS quantity;

DROP INDEX IF EXISTS idx_tickets_registration_lookup;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_registration
    ON tickets (registration_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_registration_id
    ON tickets (registration_id);

DROP TABLE IF EXISTS payments;
