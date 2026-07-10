import { describe, expect, it } from "vitest";

import {
  changeExpirationSchema,
  registerPaymentSchema,
} from "@/features/subscriptions/subscription-schemas";

describe("subscription schemas", () => {
  it("valida registro de pagamento manual", () => {
    const result = registerPaymentSchema.safeParse({
      id: "1f4b5ef8-fba5-4dc4-b331-3a5717e544c5",
      paymentDate: "2026-06-25",
      paymentMethod: "Pix",
      amountPaid: "49.90",
      newExpiresAt: "2026-07-25",
      internalNotes: "Pago diretamente.",
    });
    expect(result.success).toBe(true);
  });

  it("exige motivo ao alterar vencimento", () => {
    const result = changeExpirationSchema.safeParse({
      id: "1f4b5ef8-fba5-4dc4-b331-3a5717e544c5",
      expiresAt: "2026-07-25",
      reason: "",
    });
    expect(result.success).toBe(false);
  });
});
