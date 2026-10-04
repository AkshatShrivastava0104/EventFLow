CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,
    order_id TEXT NOT NULL UNIQUE,
    payment_id TEXT UNIQUE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id BIGINT REFERENCES events(id) ON DELETE SET NULL,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE SET NULL,
    registration_id BIGINT REFERENCES registrations(id) ON DELETE SET NULL,
    purpose TEXT NOT NULL CHECK (purpose IN ('event', 'subscription')),
    plan TEXT,
    organization_name TEXT,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed')),
    payment_method TEXT NOT NULL DEFAULT 'sandbox',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payments_user_created
    ON payments (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_event_created
    ON payments (event_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_org_created
    ON payments (organization_id, created_at DESC);

DROP INDEX IF EXISTS idx_tickets_registration;
DROP INDEX IF EXISTS idx_tickets_registration_id;

CREATE INDEX IF NOT EXISTS idx_tickets_registration_lookup
    ON tickets (registration_id);

ALTER TABLE registrations
    ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1
    CHECK (quantity > 0);

ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS subscription_plan TEXT NOT NULL DEFAULT 'starter'
        CHECK (subscription_plan IN ('starter', 'growth', 'enterprise')),
    ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'active'
        CHECK (subscription_status IN ('active', 'cancelled', 'past_due')),
    ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMPTZ;
