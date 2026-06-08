import { describe, it, expect, beforeAll } from "vitest"
import crypto from "crypto"
import { encrypt, decrypt } from "@/lib/crypto"

// Characterization tests for the AES-256-GCM helper used to protect MikroTik
// passwords at rest.
describe("crypto encrypt/decrypt (AES-256-GCM)", () => {
  beforeAll(() => {
    // 32 bytes hex = valid key for the cipher.
    process.env.APP_ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex")
  })

  it("round-trips: decrypt(encrypt(x)) === x", () => {
    const secret = "s3cr3t-mikrotik-p@ss"
    expect(decrypt(encrypt(secret))).toBe(secret)
  })

  it("ciphertext is not the plaintext", () => {
    const secret = "admin123"
    const ct = encrypt(secret)
    expect(ct).not.toBe(secret)
    expect(ct).not.toContain(secret)
  })

  it("uses a random IV: same plaintext encrypts to different ciphertexts", () => {
    expect(encrypt("same-input")).not.toBe(encrypt("same-input"))
  })

  it("rejects tampered ciphertext (auth tag mismatch)", () => {
    const ct = encrypt("important")
    // Flip the last base64 char to corrupt the encrypted payload.
    const tampered = ct.slice(0, -2) + (ct.endsWith("A") ? "B" : "A") + "="
    expect(() => decrypt(tampered)).toThrow()
  })
})
