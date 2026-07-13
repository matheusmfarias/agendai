BEGIN;

-- Authenticated ownership is independent from the tenant's operational
-- Customer record. The nullable column preserves manual, Typebot and unproven
-- legacy appointments without granting portal access.
ALTER TABLE "appointments"
ADD COLUMN "customer_user_id" UUID;

-- Candidate evidence is intentionally limited to customer-authored events for
-- the same appointment and tenant. Conflicting CUSTOMER owners fail closed.
WITH "candidate_evidence" AS (
  SELECT DISTINCT
    "event"."appointment_id",
    "event"."tenant_id",
    "owner"."id" AS "customer_user_id"
  FROM "appointment_events" AS "event"
  INNER JOIN "appointments" AS "appointment"
    ON "appointment"."id" = "event"."appointment_id"
   AND "appointment"."tenant_id" = "event"."tenant_id"
   AND "appointment"."origin" = 'PUBLIC_LINK'
  INNER JOIN "users" AS "owner"
    ON "owner"."id"::text = "event"."metadata" ->> 'customerUserId'
   AND "owner"."global_role" = 'CUSTOMER'
  WHERE "event"."actor_type" = 'CUSTOMER'
    AND "event"."event_type" IN ('CREATED', 'PUBLIC_BOOKING_CREATED')
    AND "event"."metadata" ->> 'tenantId' = "appointment"."tenant_id"::text
    AND "event"."metadata" ->> 'appointmentId' = "appointment"."id"::text
    AND "event"."metadata" ->> 'customerId' = "appointment"."customer_id"::text
    AND "event"."metadata" ->> 'origin' = 'PUBLIC_LINK'
),
"unambiguous_evidence" AS (
  SELECT
    "appointment_id",
    "tenant_id",
    MIN("customer_user_id"::text)::uuid AS "customer_user_id"
  FROM "candidate_evidence"
  GROUP BY "appointment_id", "tenant_id"
  HAVING COUNT(DISTINCT "customer_user_id") = 1
),
"proven_ownership" AS (
  SELECT
    "appointment"."id" AS "appointment_id",
    "appointment"."tenant_id",
    "evidence"."customer_user_id"
  FROM "unambiguous_evidence" AS "evidence"
  INNER JOIN "appointments" AS "appointment"
    ON "appointment"."id" = "evidence"."appointment_id"
   AND "appointment"."tenant_id" = "evidence"."tenant_id"
   AND "appointment"."origin" = 'PUBLIC_LINK'
  INNER JOIN "customers" AS "customer"
    ON "customer"."id" = "appointment"."customer_id"
   AND "customer"."tenant_id" = "appointment"."tenant_id"
   AND "customer"."user_id" = "evidence"."customer_user_id"
)
UPDATE "appointments" AS "appointment"
SET "customer_user_id" = "proof"."customer_user_id"
FROM "proven_ownership" AS "proof"
WHERE "appointment"."id" = "proof"."appointment_id"
  AND "appointment"."tenant_id" = "proof"."tenant_id";

ALTER TABLE "appointments"
ADD CONSTRAINT "appointments_customer_user_id_fkey"
FOREIGN KEY ("customer_user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "appointments_tenant_id_customer_user_id_idx"
ON "appointments"("tenant_id", "customer_user_id");

-- Assert only the rows populated by this migration. Null rows are valid and
-- include legitimate appointments created by flows that do not assign owner.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "appointments" AS "appointment"
    LEFT JOIN "customers" AS "customer"
      ON "customer"."id" = "appointment"."customer_id"
     AND "customer"."tenant_id" = "appointment"."tenant_id"
    LEFT JOIN "users" AS "owner"
      ON "owner"."id" = "appointment"."customer_user_id"
    WHERE "appointment"."customer_user_id" IS NOT NULL
      AND (
        "customer"."id" IS NULL
        OR "owner"."id" IS NULL
        OR "appointment"."origin" <> 'PUBLIC_LINK'
        OR "owner"."global_role" <> 'CUSTOMER'
        OR "customer"."user_id" IS DISTINCT FROM "appointment"."customer_user_id"
        OR NOT EXISTS (
          SELECT 1
          FROM "appointment_events" AS "event"
          WHERE "event"."appointment_id" = "appointment"."id"
            AND "event"."tenant_id" = "appointment"."tenant_id"
            AND "event"."actor_type" = 'CUSTOMER'
            AND "event"."event_type" IN ('CREATED', 'PUBLIC_BOOKING_CREATED')
            AND "event"."metadata" ->> 'customerUserId' = "appointment"."customer_user_id"::text
            AND "event"."metadata" ->> 'tenantId' = "appointment"."tenant_id"::text
            AND "event"."metadata" ->> 'appointmentId' = "appointment"."id"::text
            AND "event"."metadata" ->> 'customerId' = "appointment"."customer_id"::text
            AND "event"."metadata" ->> 'origin' = 'PUBLIC_LINK'
        )
        OR EXISTS (
          SELECT 1
          FROM "appointment_events" AS "conflict_event"
          INNER JOIN "users" AS "conflict_owner"
            ON "conflict_owner"."id"::text = "conflict_event"."metadata" ->> 'customerUserId'
           AND "conflict_owner"."global_role" = 'CUSTOMER'
          WHERE "conflict_event"."appointment_id" = "appointment"."id"
            AND "conflict_event"."tenant_id" = "appointment"."tenant_id"
            AND "conflict_event"."actor_type" = 'CUSTOMER'
            AND "conflict_event"."event_type" IN ('CREATED', 'PUBLIC_BOOKING_CREATED')
            AND "conflict_event"."metadata" ->> 'tenantId' = "appointment"."tenant_id"::text
            AND "conflict_event"."metadata" ->> 'appointmentId' = "appointment"."id"::text
            AND "conflict_event"."metadata" ->> 'customerId' = "appointment"."customer_id"::text
            AND "conflict_event"."metadata" ->> 'origin' = 'PUBLIC_LINK'
            AND "conflict_owner"."id" <> "appointment"."customer_user_id"
        )
      )
  ) THEN
    RAISE EXCEPTION 'appointment customer ownership proof invariant failed';
  END IF;
END
$$;

COMMIT;
