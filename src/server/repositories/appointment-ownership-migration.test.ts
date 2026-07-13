import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationName = "20260713170000_add_proven_appointment_customer_ownership";
const migrationDirectory = join(process.cwd(), "prisma", "migrations");
const migration = readFileSync(
  join(migrationDirectory, migrationName, "migration.sql"),
  "utf8",
);

describe("Appointment.customerUserId migration", () => {
  it("uses one new atomic migration", () => {
    expect(migrationName).toBe(
      "20260713170000_add_proven_appointment_customer_ownership",
    );
    expect(migration.trim().startsWith("BEGIN;")).toBe(true);
    expect(migration.trim().endsWith("COMMIT;")).toBe(true);
    expect(migration.match(/\bBEGIN;/g)).toHaveLength(1);
    expect(migration.match(/\bCOMMIT;/g)).toHaveLength(1);
    expect(
      readdirSync(migrationDirectory).filter((name) =>
        name.includes("appointment_customer_owner"),
      ),
    ).toEqual([migrationName]);
  });

  it("adds nullable ownership without an intermediate broad update", () => {
    expect(migration).toContain('ADD COLUMN "customer_user_id" UUID;');
    expect(migration).not.toContain('"customer_user_id" UUID NOT NULL');
    expect(migration).not.toMatch(
      /UPDATE "appointments"\s+SET "customer_user_id" = NULL/i,
    );
    expect(migration).not.toMatch(/phone|email/i);
  });

  it("backfills only unambiguous same-tenant PUBLIC_LINK event proof", () => {
    expect(migration).toContain('"appointment"."origin" = \'PUBLIC_LINK\'');
    expect(migration).toContain(
      '"appointment"."tenant_id" = "event"."tenant_id"',
    );
    expect(migration).toContain('"event"."actor_type" = \'CUSTOMER\'');
    expect(migration).toContain(
      '"event"."event_type" IN (\'CREATED\', \'PUBLIC_BOOKING_CREATED\')',
    );
    expect(migration).toContain(
      '"owner"."id"::text = "event"."metadata" ->> \'customerUserId\'',
    );
    expect(migration).toContain('"owner"."global_role" = \'CUSTOMER\'');
    expect(migration).toContain(
      'HAVING COUNT(DISTINCT "customer_user_id") = 1',
    );
    expect(migration).toContain(
      '"customer"."user_id" = "evidence"."customer_user_id"',
    );
    expect(migration).toContain(
      '"event"."metadata" ->> \'tenantId\' = "appointment"."tenant_id"::text',
    );
    expect(migration).toContain(
      '"event"."metadata" ->> \'appointmentId\' = "appointment"."id"::text',
    );
    expect(migration).toContain(
      '"event"."metadata" ->> \'customerId\' = "appointment"."customer_id"::text',
    );
    expect(migration).toContain(
      '"event"."metadata" ->> \'origin\' = \'PUBLIC_LINK\'',
    );
  });

  it("adds the safe FK, mapped tenant-owner index and proof assertion", () => {
    expect(migration).toContain("ON DELETE SET NULL ON UPDATE CASCADE");
    expect(migration).toContain(
      'CREATE INDEX "appointments_tenant_id_customer_user_id_idx"',
    );
    expect(migration).toContain(
      'ON "appointments"("tenant_id", "customer_user_id")',
    );
    expect(migration).toContain("DO $$");
    expect(migration).toContain(
      "appointment customer ownership proof invariant failed",
    );
    expect(migration).toContain('"appointment"."customer_user_id" IS NOT NULL');
  });

  it("ignores partial or divergent metadata in proof and conflict checks", () => {
    for (const field of ["tenantId", "appointmentId", "customerId", "origin"]) {
      expect(migration.match(new RegExp(`"event"\\."metadata" ->> '${field}'`, "g"))).toHaveLength(2);
      expect(
        migration.match(
          new RegExp(`"conflict_event"\\."metadata" ->> '${field}'`, "g"),
        ),
      ).toHaveLength(1);
    }
    expect(migration).not.toContain("RAISE EXCEPTION 'invalid appointment event metadata'");
  });
});
