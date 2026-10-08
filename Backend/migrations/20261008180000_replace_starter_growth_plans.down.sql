ALTER TABLE payments
    DROP CONSTRAINT IF EXISTS payments_plan_check;

UPDATE payments
SET plan = CASE plan
    WHEN 'pro' THEN 'starter'
    WHEN 'plus' THEN 'growth'
    ELSE plan
END
WHERE plan IS NOT NULL;

ALTER TABLE payments
    ADD CONSTRAINT payments_plan_check
        CHECK (plan IS NULL OR plan IN ('starter', 'growth', 'enterprise'));

ALTER TABLE organizations
    DROP CONSTRAINT IF EXISTS organizations_subscription_plan_check;

UPDATE organizations
SET subscription_plan = CASE subscription_plan
    WHEN 'pro' THEN 'starter'
    WHEN 'plus' THEN 'growth'
    ELSE subscription_plan
END;

ALTER TABLE organizations
    ALTER COLUMN subscription_plan SET DEFAULT 'starter',
    ADD CONSTRAINT organizations_subscription_plan_check
        CHECK (subscription_plan IN ('starter', 'growth', 'enterprise'));
