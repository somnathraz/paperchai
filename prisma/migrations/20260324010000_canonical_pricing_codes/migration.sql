DO $$
DECLARE
  old_plan_id TEXT;
  new_plan_id TEXT;
BEGIN
  SELECT id INTO old_plan_id FROM "SubscriptionPlan" WHERE code = 'PRO' LIMIT 1;
  SELECT id INTO new_plan_id FROM "SubscriptionPlan" WHERE code = 'PREMIUM' LIMIT 1;

  IF old_plan_id IS NOT NULL THEN
    IF new_plan_id IS NULL THEN
      UPDATE "SubscriptionPlan"
      SET code = 'PREMIUM', name = 'Premium'
      WHERE id = old_plan_id;
    ELSE
      UPDATE "Subscription" SET "planId" = new_plan_id WHERE "planId" = old_plan_id;
      UPDATE "PlanPrice" SET "planId" = new_plan_id WHERE "planId" = old_plan_id;
      DELETE FROM "SubscriptionPlan" WHERE id = old_plan_id;
    END IF;
  END IF;
END $$;

DO $$
DECLARE
  old_plan_id TEXT;
  new_plan_id TEXT;
BEGIN
  SELECT id INTO old_plan_id FROM "SubscriptionPlan" WHERE code = 'STUDIO' LIMIT 1;
  SELECT id INTO new_plan_id FROM "SubscriptionPlan" WHERE code = 'PREMIER' LIMIT 1;

  IF old_plan_id IS NOT NULL THEN
    IF new_plan_id IS NULL THEN
      UPDATE "SubscriptionPlan"
      SET code = 'PREMIER', name = 'Premier'
      WHERE id = old_plan_id;
    ELSE
      UPDATE "Subscription" SET "planId" = new_plan_id WHERE "planId" = old_plan_id;
      UPDATE "PlanPrice" SET "planId" = new_plan_id WHERE "planId" = old_plan_id;
      DELETE FROM "SubscriptionPlan" WHERE id = old_plan_id;
    END IF;
  END IF;
END $$;
