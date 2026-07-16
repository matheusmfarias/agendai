import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const DEDICATED_KEY_VERSION = "v1";
const AUTH_SECRET_VERSION = "v1a";

type CredentialEnvironment = Record<string, string | undefined>;

function dedicatedEncryptionKey(environment: CredentialEnvironment) {
  const encoded = environment.TYPEBOT_CREDENTIAL_ENCRYPTION_KEY;
  if (!encoded) return null;
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32 || key.toString("base64") !== encoded) {
    throw new Error("TYPEBOT_CREDENTIAL_ENCRYPTION_KEY deve conter 32 bytes em base64.");
  }
  return key;
}

function authSecretEncryptionKey(environment: CredentialEnvironment) {
  const secret = environment.AUTH_SECRET;
  if (!secret || secret.length < 32) return null;
  return createHash("sha256")
    .update("agendai:typebot-credential:v1\0", "utf8")
    .update(secret, "utf8")
    .digest();
}

function encryptionMaterial(environment: CredentialEnvironment) {
  const dedicated = dedicatedEncryptionKey(environment);
  if (dedicated) return { version: DEDICATED_KEY_VERSION, key: dedicated };
  const derived = authSecretEncryptionKey(environment);
  if (derived) return { version: AUTH_SECRET_VERSION, key: derived };
  throw new Error("Criptografia de credenciais Typebot não configurada.");
}

function decryptionKey(version: string, environment: CredentialEnvironment) {
  if (version === DEDICATED_KEY_VERSION) return dedicatedEncryptionKey(environment);
  if (version === AUTH_SECRET_VERSION) return authSecretEncryptionKey(environment);
  return null;
}

export function encryptTypebotCredential(
  token: string,
  environment: CredentialEnvironment = process.env,
) {
  const material = encryptionMaterial(environment);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, material.key, iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [material.version, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptTypebotCredential(
  encrypted: string,
  environment: CredentialEnvironment = process.env,
) {
  const [version, ivValue, tagValue, ciphertextValue] = encrypted.split(".");
  const key = decryptionKey(version ?? "", environment);
  if (!key || !ivValue || !tagValue || !ciphertextValue) {
    throw new Error("Credencial Typebot cifrada inválida.");
  }
  try {
    const decipher = createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(ivValue, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextValue, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new Error("Credencial Typebot cifrada inválida.");
  }
}
