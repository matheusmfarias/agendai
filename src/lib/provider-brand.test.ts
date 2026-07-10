import { describe, expect, it } from "vitest";

import {
  getProviderDisplayName,
  getProviderLogoFallbackText,
} from "@/lib/provider-brand";

describe("provider brand helpers", () => {
  it("uses public display name before legal name", () => {
    expect(
      getProviderDisplayName({
        name: "Logica Informatica LTDA",
        publicDisplayName: "Logica - Solucoes Inteligentes",
      }),
    ).toBe("Logica - Solucoes Inteligentes");
  });

  it("ignores separators when building fallback text", () => {
    expect(getProviderLogoFallbackText("Logica - Solucoes Inteligentes")).toBe(
      "LS",
    );
  });
});
