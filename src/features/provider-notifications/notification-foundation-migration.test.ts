import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "prisma/migrations/20260713190000_add_provider_notification_audience_receipts/migration.sql",
  ),
  "utf8",
);

describe("provider notification audience and receipts migration", () => {
  it("is atomic and introduces explicit audience with deterministic dedupe", () => {
    expect(migration.trim().startsWith("BEGIN;")).toBe(true);
    expect(migration.trim().endsWith("COMMIT;")).toBe(true);
    expect(migration).toContain("ProviderNotificationAudience");
    expect(migration).toContain('ADD COLUMN "dedupe_key" TEXT');
    expect(migration).toContain('COALESCE("recipient_user_id"::text, \'*\')');
    expect(migration).toContain(
      '"audience"::text,\n  COALESCE("recipient_user_id"::text, \'*\'),\n  "type",\n  COALESCE("entity_type", \'*\'),\n  COALESCE("entity_id"::text, "id"::text)',
    );
    expect(migration).toContain(
      'UNIQUE ("tenant_id", "dedupe_key")',
    );
  });

  it("enforces tenant-safe cascading private recipients and receipts", () => {
    expect(migration).toContain(
      'FOREIGN KEY ("tenant_id", "recipient_user_id")',
    );
    expect(migration).toContain(
      'REFERENCES "tenant_users"("tenant_id", "user_id")',
    );
    expect(migration).toContain(
      'FOREIGN KEY ("notification_id", "tenant_id")',
    );
    expect(migration.replaceAll("\n", " ")).not.toMatch(
      /recipient_user_id[^;]+ON DELETE SET NULL/,
    );
    expect(migration.match(/ON DELETE CASCADE/g)?.length).toBeGreaterThanOrEqual(3);
    expect(migration).toContain(
      '("audience" = \'TENANT\' AND "recipient_user_id" IS NULL)',
    );
    expect(migration).toContain(
      '("audience" = \'USER\' AND "recipient_user_id" IS NOT NULL)',
    );
    expect(migration).not.toContain("ON DELETE SET NULL");
  });

  it("backfills receipts only for private legacy reads", () => {
    const backfill = migration.slice(migration.indexOf('INSERT INTO "provider_notification_reads"'));
    expect(backfill).toContain('WHERE "audience" = \'USER\'');
    expect(backfill).toContain('"recipient_user_id" IS NOT NULL');
    expect(backfill).toContain('"read_at" IS NOT NULL');
    expect(backfill).not.toContain('"audience" = \'TENANT\'');
  });

  it("keeps tenant broadcasts tenant-wide when private memberships are deleted", () => {
    expect(migration).toContain(
      'SET "audience" = \'USER\'\nWHERE "recipient_user_id" IS NOT NULL',
    );
    expect(migration).toContain(
      'FOREIGN KEY ("tenant_id", "recipient_user_id")',
    );
    expect(migration).toContain("ON DELETE CASCADE ON UPDATE CASCADE");
    expect(migration).not.toMatch(
      /FOREIGN KEY \("tenant_id", "recipient_user_id"\)[\s\S]*?ON DELETE SET NULL/,
    );
  });

  it("keeps legacy readAt but adds audience, action URL and priority checks", () => {
    expect(migration).not.toMatch(/DROP COLUMN "read_at"/);
    expect(migration).toContain("provider_notifications_audience_recipient_check");
    expect(migration).toContain("provider_notifications_action_url_check");
    expect(migration).toContain("provider_notifications_priority_check");
  });
});
