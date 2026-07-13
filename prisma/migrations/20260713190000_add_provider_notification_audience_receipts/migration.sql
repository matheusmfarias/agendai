BEGIN;

CREATE TYPE "ProviderNotificationAudience" AS ENUM ('TENANT', 'USER');

ALTER TABLE "provider_notifications"
  ADD COLUMN "audience" "ProviderNotificationAudience" NOT NULL DEFAULT 'TENANT',
  ADD COLUMN "dedupe_key" TEXT;

UPDATE "provider_notifications"
SET "audience" = 'USER'
WHERE "recipient_user_id" IS NOT NULL;

UPDATE "provider_notifications"
SET "dedupe_key" = concat_ws(
  ':',
  "audience"::text,
  COALESCE("recipient_user_id"::text, '*'),
  "type",
  COALESCE("entity_type", '*'),
  COALESCE("entity_id"::text, "id"::text)
);

ALTER TABLE "provider_notifications"
  ALTER COLUMN "dedupe_key" SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "provider_notifications" AS "notification"
    WHERE "notification"."audience" = 'USER'
      AND NOT EXISTS (
        SELECT 1
        FROM "tenant_users" AS "membership"
        WHERE "membership"."tenant_id" = "notification"."tenant_id"
          AND "membership"."user_id" = "notification"."recipient_user_id"
      )
  ) THEN
    RAISE EXCEPTION 'private provider notification has no tenant membership';
  END IF;
END
$$;

ALTER TABLE "provider_notifications"
  DROP CONSTRAINT "provider_notifications_recipient_user_id_fkey";

DROP INDEX "provider_notifications_tenant_id_type_entity_id_key";
DROP INDEX "provider_notifications_recipient_user_id_idx";

ALTER TABLE "provider_notifications"
  ADD CONSTRAINT "provider_notifications_audience_recipient_check"
  CHECK (
    ("audience" = 'TENANT' AND "recipient_user_id" IS NULL)
    OR ("audience" = 'USER' AND "recipient_user_id" IS NOT NULL)
  ),
  ADD CONSTRAINT "provider_notifications_action_url_check"
  CHECK (
    "action_url" IS NULL
    OR (
      "action_url" ~ '^/app(/|$)'
      AND "action_url" !~ '^//'
      AND "action_url" !~ '[\\]'
      AND "action_url" !~ '://'
    )
  ),
  ADD CONSTRAINT "provider_notifications_priority_check"
  CHECK ("priority" IN ('low', 'medium', 'high', 'critical')),
  ADD CONSTRAINT "provider_notifications_dedupe_key_check"
  CHECK (length(btrim("dedupe_key")) > 0),
  ADD CONSTRAINT "provider_notifications_recipient_membership_fkey"
  FOREIGN KEY ("tenant_id", "recipient_user_id")
  REFERENCES "tenant_users"("tenant_id", "user_id")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "provider_notifications_id_tenant_id_key"
  UNIQUE ("id", "tenant_id"),
  ADD CONSTRAINT "provider_notifications_tenant_id_dedupe_key_key"
  UNIQUE ("tenant_id", "dedupe_key");

CREATE INDEX "provider_notifications_tenant_id_recipient_user_id_idx"
  ON "provider_notifications"("tenant_id", "recipient_user_id");

CREATE TABLE "provider_notification_reads" (
  "id" UUID NOT NULL,
  "notification_id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "read_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "provider_notification_reads_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "provider_notification_reads_notification_tenant_fkey"
    FOREIGN KEY ("notification_id", "tenant_id")
    REFERENCES "provider_notifications"("id", "tenant_id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "provider_notification_reads_membership_fkey"
    FOREIGN KEY ("tenant_id", "user_id")
    REFERENCES "tenant_users"("tenant_id", "user_id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "provider_notification_reads_notification_tenant_user_key"
  ON "provider_notification_reads"("notification_id", "tenant_id", "user_id");
CREATE INDEX "provider_notification_reads_tenant_user_read_at_idx"
  ON "provider_notification_reads"("tenant_id", "user_id", "read_at");

-- A legacy private read belongs to its known recipient. Legacy tenant-wide
-- readAt is deliberately not fanned out because the actual readers are unknown.
INSERT INTO "provider_notification_reads" (
  "id", "notification_id", "tenant_id", "user_id", "read_at"
)
SELECT
  gen_random_uuid(),
  "id",
  "tenant_id",
  "recipient_user_id",
  "read_at"
FROM "provider_notifications"
WHERE "audience" = 'USER'
  AND "recipient_user_id" IS NOT NULL
  AND "read_at" IS NOT NULL
ON CONFLICT ("notification_id", "tenant_id", "user_id") DO NOTHING;

COMMIT;
