DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    FOR constraint_name IN
        SELECT constraint_row.conname
        FROM pg_constraint AS constraint_row
        WHERE constraint_row.conrelid = 'organizations'::regclass
          AND constraint_row.contype = 'c'
          AND pg_get_constraintdef(constraint_row.oid) ILIKE '%subscription_plan%'
    LOOP
        EXECUTE format(
            'ALTER TABLE organizations DROP CONSTRAINT %I',
            constraint_name
        );
    END LOOP;
END
$$;

UPDATE organizations
SET subscription_plan = CASE subscription_plan
    WHEN 'starter' THEN 'pro'
    WHEN 'growth' THEN 'plus'
    WHEN 'enterprise' THEN 'plus'
    ELSE subscription_plan
END;

ALTER TABLE organizations
    ALTER COLUMN subscription_plan SET DEFAULT 'pro',
    ADD CONSTRAINT organizations_subscription_plan_check
        CHECK (subscription_plan IN ('pro', 'plus'));
