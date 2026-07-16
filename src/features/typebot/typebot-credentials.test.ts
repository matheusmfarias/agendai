import { describe, expect, it } from "vitest";

import {
  generateTypebotToken,
  hashToken,
} from "@/features/typebot/typebot-token-utils";
import {
  decryptTypebotCredential,
  encryptTypebotCredential,
} from "@/features/typebot/typebot-credential-crypto";

const encryptionEnvironment = {
  TYPEBOT_CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
};

describe("generateTypebotToken", () => {
  it("gera token com prefixo agz_tb_", () => {
    const { token } = generateTypebotToken();
    expect(token.startsWith("agz_tb_")).toBe(true);
  });

  it("gera token com comprimento esperado", () => {
    // prefix 7 chars + 43 base64url chars = 50
    const { token } = generateTypebotToken();
    expect(token.length).toBeGreaterThanOrEqual(48);
  });

  it("gera prefixo com exatamente 16 caracteres", () => {
    const { prefix } = generateTypebotToken();
    expect(prefix.length).toBe(16);
    expect(prefix.startsWith("agz_tb_")).toBe(true);
  });

  it("gera tokens diferentes a cada chamada", () => {
    const tokens = new Set(
      Array.from({ length: 10 }, () => generateTypebotToken().token),
    );
    expect(tokens.size).toBe(10);
  });

  it("prefixo corresponde ao início do token", () => {
    const { token, prefix } = generateTypebotToken();
    expect(token.slice(0, 16)).toBe(prefix);
  });

  it("hash não é reversível ao token", () => {
    const { token, hash } = generateTypebotToken();
    // Re-hashing should produce the same hash
    expect(hashToken(token)).toBe(hash);
    // Hash is not a substring of the token
    expect(token.includes(hash)).toBe(false);
  });
});

describe("hashToken", () => {
  it("produz hash SHA-256 em hex", () => {
    const hash = hashToken("agz_tb_test-token-value");
    // SHA-256 hex output is 64 characters
    expect(hash).toHaveLength(64);
    // Must be hex
    expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);
  });

  it("produz o mesmo hash para o mesmo token", () => {
    const token = "agz_tb_my-test-token";
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it("produz hashes diferentes para tokens diferentes", () => {
    const hash1 = hashToken("agz_tb_token-1");
    const hash2 = hashToken("agz_tb_token-2");
    expect(hash1).not.toBe(hash2);
  });

  it("usa SHA-256 e não bcrypt (tempo constante)", () => {
    // SHA-256 deve ser rápido — menos de 10ms
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      hashToken(`agz_tb_token-${i}`);
    }
    const elapsed = performance.now() - start;
    // 100 SHA-256 hashes should take well under 100ms
    expect(elapsed).toBeLessThan(100);
  });
});

describe("typebot token security", () => {
  it("token não contém caracteres problemáticos para URL/header", () => {
    for (let i = 0; i < 20; i++) {
      const { token } = generateTypebotToken();
      // base64url apenas: a-z, A-Z, 0-9, -, _
      expect(/^agz_tb_[A-Za-z0-9_-]+$/.test(token)).toBe(true);
    }
  });

  it("hash nunca contém o prefixo do token", () => {
    for (let i = 0; i < 10; i++) {
      const { token, hash } = generateTypebotToken();
      // The hash should not appear in the token
      expect(token.includes(hash)).toBe(false);
      // The token prefix should not appear in the hash
      expect(hash.includes("agz_tb_")).toBe(false);
    }
  });
});

describe("typebot credential encryption", () => {
  it("cifra e recupera o token sem persistir texto puro", () => {
    const token = "agz_tb_tenant_secret";
    const encrypted = encryptTypebotCredential(token, encryptionEnvironment);

    expect(encrypted).not.toContain(token);
    expect(decryptTypebotCredential(encrypted, encryptionEnvironment)).toBe(token);
  });

  it("falha de forma segura sem chave ou com conteúdo adulterado", () => {
    expect(() => encryptTypebotCredential("agz_tb_secret", {})).toThrow(
      "Criptografia de credenciais Typebot não configurada.",
    );
    const encrypted = encryptTypebotCredential("agz_tb_secret", encryptionEnvironment);
    expect(() => decryptTypebotCredential(`${encrypted}x`, encryptionEnvironment)).toThrow(
      "Credencial Typebot cifrada inválida.",
    );
  });

  it("usa chave derivada de AUTH_SECRET quando a chave dedicada está ausente", () => {
    const environment = { AUTH_SECRET: "a".repeat(48) };
    const encrypted = encryptTypebotCredential("agz_tb_auth_secret", environment);

    expect(encrypted.startsWith("v1a.")).toBe(true);
    expect(decryptTypebotCredential(encrypted, environment)).toBe("agz_tb_auth_secret");
  });
});
