import { describe, expect, it } from "vitest";

import {
  providerNotificationIdSchema,
  providerNotificationListQuerySchema,
  safeProviderNotificationActionUrl,
  sanitizeProviderNotificationMetadata,
  serializeProviderNotification,
  typesForNotificationCategory,
} from "@/features/provider-notifications/notification-contract";

describe("provider notification API contract", () => {
  it("rejects malformed notification ids and cursors at the boundary", () => {
    expect(providerNotificationIdSchema.safeParse("not-an-id").success).toBe(
      false,
    );
    expect(
      providerNotificationListQuerySchema.safeParse({ cursor: "not-an-id" })
        .success,
    ).toBe(false);
  });

  it("accepts only internal /app action URLs", () => {
    expect(safeProviderNotificationActionUrl("/app/appointments?id=1")).toBe(
      "/app/appointments?id=1",
    );
    expect(safeProviderNotificationActionUrl("https://evil.example/app")).toBeNull();
    expect(safeProviderNotificationActionUrl("//evil.example/app")).toBeNull();
    expect(safeProviderNotificationActionUrl("/cliente")).toBeNull();
    expect(safeProviderNotificationActionUrl("/app\\evil")).toBeNull();
    expect(
      safeProviderNotificationActionUrl("/app/%2e%2e/admin"),
    ).toBeNull();
    expect(safeProviderNotificationActionUrl("/app/%2Fadmin")).toBeNull();
    expect(safeProviderNotificationActionUrl("/app/%5cadmin")).toBeNull();
    expect(
      safeProviderNotificationActionUrl("/app/appointments?return=%2Fapp"),
    ).toBe("/app/appointments?return=%2Fapp");
  });

  it("sanitizes metadata through a strict allowlist", () => {
    expect(
      sanitizeProviderNotificationMetadata({
        customerName: "Maria",
        source: "public_link",
        tenantSecret: "hidden",
      }),
    ).toEqual({ customerName: "Maria", source: "public_link" });
  });

  it("maps category filters to their server-side types", () => {
    expect(typesForNotificationCategory("financial")).toEqual([
      "payment_pending",
      "payment_received",
    ]);
  });

  it("serializes GET and PATCH records with safe enums, dates, URL and metadata", () => {
    const readAt = new Date("2026-07-13T12:00:00.000Z");
    const result = serializeProviderNotification({
      id: crypto.randomUUID(),
      tenantId: crypto.randomUUID(),
      audience: "TENANT",
      recipientUserId: null,
      type: "unexpected_type",
      priority: "unexpected_priority",
      title: "Aviso",
      description: "Descrição",
      entityType: "unexpected_entity",
      entityId: crypto.randomUUID(),
      actionUrl: "https://evil.example/app",
      archivedAt: null,
      createdAt: new Date("2026-07-13T11:00:00.000Z"),
      metadata: { customerName: "Maria", secret: "hidden" },
      reads: [{ readAt }],
    });

    expect(result).toMatchObject({
      type: "system",
      priority: "medium",
      entityType: null,
      actionUrl: null,
      readAt: readAt.toISOString(),
      createdAt: "2026-07-13T11:00:00.000Z",
      metadata: { customerName: "Maria" },
    });
  });
});
