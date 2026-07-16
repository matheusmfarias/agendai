import { describe, expect, it } from "vitest";

import { buildSimulatorCustomValues } from "@/features/typebot-simulator/simulator-types";

describe("buildSimulatorCustomValues", () => {
  it("keeps multiple answered values as objects and omits optional empty fields", () => {
    const fields = [
      { id: "text" },
      { id: "optional" },
      { id: "number" },
      { id: "boolean" },
    ];

    expect(
      buildSimulatorCustomValues(fields, {
        text: 'Onix "Premier" 2020',
        optional: "   ",
        number: "2",
        boolean: "Sim",
      }),
    ).toEqual([
      { customFieldId: "text", value: 'Onix "Premier" 2020' },
      { customFieldId: "number", value: "2" },
      { customFieldId: "boolean", value: "Sim" },
    ]);
  });
});
