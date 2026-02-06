import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY = Buffer.from(process.env.ENCRYPTION_KEY || "", "hex");

// → ENCRYPTION FLOW: text → AES-256-GCM → encrypted data + IV + authTag
export function encrypt(text: string) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = cipher.update(text, "utf8", "hex") + cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return {
    encryptedData: encrypted,
    iv: iv.toString("hex"),
    authTag,
  };
}

// → DECRYPTION FLOW: encrypted data + IV + authTag → AES-256-GCM → original text
export function decrypt(
  encryptedData: string,
  ivHex: string,
  authTagHex: string,
) {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    KEY,
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  return decipher.update(encryptedData, "hex", "utf8") + decipher.final("utf8");
}
