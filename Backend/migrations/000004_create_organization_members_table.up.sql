CREATE TABLE IF NOT EXISTS organization_members (
    organization_id BIGINT NOT NULL
        REFERENCES organizations(id) ON DELETE CASCADE,

    user_id BIGINT NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    role TEXT NOT NULL DEFAULT 'STAFF'
        CHECK (role IN ('ADMIN', 'STAFF')),

    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (organization_id, user_id)
);