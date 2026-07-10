import { describe, expect, it } from "vitest";

import { loginSchema } from "@/features/auth/auth-schemas";

describe("login schema", () => {
  it("normaliza o e-mail válido", () => {
    const result = loginSchema.parse({
      email: " ADMIN@EXAMPLE.COM ",
      password: "senha-segura",
    });

    expect(result.email).toBe("admin@example.com");
  });

  it("rejeita senha com menos de oito caracteres", () => {
    const result = loginSchema.safeParse({
      email: "admin@example.com",
      password: "curta",
    });

    expect(result.success).toBe(false);
  });
});
