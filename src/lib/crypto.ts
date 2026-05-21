import crypto from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12
const KEY_LENGTH = 32

function getKey(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY
  if (!raw) {
    throw new Error(
      "APP_ENCRYPTION_KEY env var is required (64-char hex = 32 bytes). " +
        "Generate one with: openssl rand -hex 32"
    )
  }
  const key = Buffer.from(raw, "hex")
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `APP_ENCRYPTION_KEY must decode to ${KEY_LENGTH} bytes (got ${key.length})`
    )
  }
  return key
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString("base64")
}

export function decrypt(ciphertext: string): string {
  const data = Buffer.from(ciphertext, "base64")
  const iv = data.subarray(0, IV_LENGTH)
  const tag = data.subarray(IV_LENGTH, IV_LENGTH + 16)
  const encrypted = data.subarray(IV_LENGTH + 16)
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv)
  decipher.setAuthTag(tag)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString("utf8")
}
