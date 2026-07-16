import { describe, expect, it } from "vitest";

import { checkTypebotRateLimit, getClientIp, RATE_LIMITS } from "@/features/typebot/typebot-rate-limit";

// ---------------------------------------------------------------------------
// The rate limiter uses a shared Map. Each test uses unique keys to avoid
// cross-test interference.
// ---------------------------------------------------------------------------

describe("checkTypebotRateLimit", () => {
  it("permite a primeira requisição autenticada", () => {
    const result = checkTypebotRateLimit(
      "tenant-a",
      "business",
      true,
      "cred-1",
      "10.0.0.1",
    );
    expect(result.ok).toBe(true);
  });

  it("permite a primeira requisição não autenticada", () => {
    const result = checkTypebotRateLimit(
      "tenant-a",
      "auth",
      false,
      "unauthenticated",
      "10.0.0.1",
    );
    expect(result.ok).toBe(true);
  });

  it("bloqueia quando excede limite de auth-failed (20 req/min)", () => {
    const slug = "tenant-b";
    const ip = "10.0.0.2";

    // Exhaust the auth-fail limit
    for (let i = 0; i < RATE_LIMITS.AUTH_FAIL_LIMIT; i++) {
      const result = checkTypebotRateLimit(
        slug,
        "auth",
        false,
        "unauthenticated",
        ip,
      );
      expect(result.ok).toBe(true);
    }

    // Next should be blocked
    const blocked = checkTypebotRateLimit(
      slug,
      "auth",
      false,
      "unauthenticated",
      ip,
    );
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.retryAfter).toBeGreaterThan(0);
    }
  });

  it("bloqueia quando excede limite de leitura (120 req/min)", () => {
    const slug = "tenant-c";
    const credId = "cred-read-test";

    for (let i = 0; i < RATE_LIMITS.READ_LIMIT; i++) {
      const result = checkTypebotRateLimit(
        slug,
        "services",
        true,
        credId,
        "10.0.0.3",
      );
      expect(result.ok).toBe(true);
    }

    const blocked = checkTypebotRateLimit(
      slug,
      "services",
      true,
      credId,
      "10.0.0.3",
    );
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.retryAfter).toBeGreaterThan(0);
    }
  });

  it("bloqueia quando excede limite de escrita (30 req/min)", () => {
    const slug = "tenant-d";
    const credId = "cred-write-test";

    for (let i = 0; i < RATE_LIMITS.WRITE_LIMIT; i++) {
      const result = checkTypebotRateLimit(
        slug,
        "appointments",
        true,
        credId,
        "10.0.0.4",
      );
      expect(result.ok).toBe(true);
    }

    const blocked = checkTypebotRateLimit(
      slug,
      "appointments",
      true,
      credId,
      "10.0.0.4",
    );
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.retryAfter).toBeGreaterThan(0);
    }
  });

  it("não bloqueia requisições para tenants diferentes", () => {
    const credIdA = "cred-isolated-a";
    const credIdB = "cred-isolated-b";

    // Fill up tenant A's limit
    for (let i = 0; i < RATE_LIMITS.READ_LIMIT; i++) {
      checkTypebotRateLimit("tenant-ea", "business", true, credIdA, "10.0.0.5");
    }

    // Tenant B should still be fine
    const result = checkTypebotRateLimit(
      "tenant-eb",
      "business",
      true,
      credIdB,
      "10.0.0.6",
    );
    expect(result.ok).toBe(true);
  });

  it("não bloqueia requisições de credenciais diferentes no mesmo tenant", () => {
    const slug = "tenant-f";

    // Fill up cred-1's limit
    for (let i = 0; i < RATE_LIMITS.READ_LIMIT; i++) {
      checkTypebotRateLimit(slug, "business", true, "cred-f1", "10.0.0.7");
    }

    // cred-f1 should be blocked
    const blocked = checkTypebotRateLimit(
      slug,
      "business",
      true,
      "cred-f1",
      "10.0.0.7",
    );
    expect(blocked.ok).toBe(false);

    // cred-f2 should still be fine
    const fine = checkTypebotRateLimit(
      slug,
      "business",
      true,
      "cred-f2",
      "10.0.0.7",
    );
    expect(fine.ok).toBe(true);
  });

  it("trata read groups como limites separados", () => {
    const slug = "tenant-g";
    const credId = "cred-g";

    // Fill up "business" limit
    for (let i = 0; i < RATE_LIMITS.READ_LIMIT; i++) {
      checkTypebotRateLimit(slug, "business", true, credId, "10.0.0.8");
    }

    // "slots" should still be fine (different endpoint group)
    const result = checkTypebotRateLimit(
      slug,
      "slots",
      true,
      credId,
      "10.0.0.8",
    );
    expect(result.ok).toBe(true);
  });

  it.each(["categories", "available-periods", "custom-fields"])(
    "classifica %s como leitura",
    (endpoint) => {
      const slug = `tenant-read-${endpoint}`;
      const credential = `cred-read-${endpoint}`;

      for (let index = 0; index <= RATE_LIMITS.WRITE_LIMIT; index++) {
        expect(
          checkTypebotRateLimit(
            slug,
            endpoint,
            true,
            credential,
            "10.0.0.20",
          ).ok,
        ).toBe(true);
      }
    },
  );
});

describe("getClientIp", () => {
  it("extrai IP do header x-forwarded-for", () => {
    const req = new Request("http://localhost/api/typebot/test/business", {
      headers: { "x-forwarded-for": "192.168.1.1, 10.0.0.1" },
    });
    expect(getClientIp(req)).toBe("192.168.1.1");
  });

  it("extrai IP do header x-real-ip", () => {
    const req = new Request("http://localhost/api/typebot/test/business", {
      headers: { "x-real-ip": "192.168.1.2" },
    });
    expect(getClientIp(req)).toBe("192.168.1.2");
  });

  it("retorna 'unknown' quando não há headers de IP", () => {
    const req = new Request("http://localhost/api/typebot/test/business");
    expect(getClientIp(req)).toBe("unknown");
  });
});

describe("RATE_LIMITS constants", () => {
  it("define limites esperados", () => {
    expect(RATE_LIMITS.READ_LIMIT).toBe(120);
    expect(RATE_LIMITS.WRITE_LIMIT).toBe(30);
    expect(RATE_LIMITS.AUTH_FAIL_LIMIT).toBe(20);
    expect(RATE_LIMITS.WINDOW_MS).toBe(60_000);
  });

  it("identifica grupos de leitura corretamente", () => {
    expect(RATE_LIMITS.READ_GROUPS.has("business")).toBe(true);
    expect(RATE_LIMITS.READ_GROUPS.has("services")).toBe(true);
    expect(RATE_LIMITS.READ_GROUPS.has("service-detail")).toBe(true);
    expect(RATE_LIMITS.READ_GROUPS.has("custom-fields")).toBe(true);
    expect(RATE_LIMITS.READ_GROUPS.has("available-dates")).toBe(true);
    expect(RATE_LIMITS.READ_GROUPS.has("slots")).toBe(true);
    expect(RATE_LIMITS.READ_GROUPS.has("appointment-detail")).toBe(true);
    expect(RATE_LIMITS.READ_GROUPS.has("identify")).toBe(false);
    expect(RATE_LIMITS.READ_GROUPS.has("appointments")).toBe(false);
  });
});
