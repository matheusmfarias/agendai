import { describe, expect, it } from "vitest";

import { getPublicLinkChannelStatus } from "@/features/provider-dashboard/provider-dashboard-channel-status";

describe("getPublicLinkChannelStatus", () => {
  it("marks the persisted enabled setting as active", () => {
    expect(getPublicLinkChannelStatus(true)).toEqual({
      ready: true,
      label: "Link público ativo",
      tone: "success",
    });
  });

  it("marks the persisted disabled setting as inactive", () => {
    expect(getPublicLinkChannelStatus(false)).toEqual({
      ready: false,
      label: "Link público desativado",
      tone: "error",
    });
  });
});
