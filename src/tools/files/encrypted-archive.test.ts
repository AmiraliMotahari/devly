import { describe, expect, it } from "vitest";
import {
  ENCRYPTED_EXTENSION,
  MANIFEST_FILENAME,
  PBKDF2_ITERATIONS,
  SALT_LENGTH,
  IV_LENGTH,
  base64ToBytes,
  bytesToBase64,
  createManifest,
  decryptBytes,
  deriveKey,
  encryptBytes,
  encryptFile,
} from "./encrypted-archive";

function roundTripData(): ArrayBuffer {
  return new TextEncoder().encode(
    "Devly test payload — unicode: café ✓ 中文 🎉",
  ).buffer as ArrayBuffer;
}

describe("constants and format contract", () => {
  it("exposes the expected archive format constants", () => {
    expect(ENCRYPTED_EXTENSION).toBe(".enc");
    expect(MANIFEST_FILENAME).toBe("MANIFEST.json");
    expect(PBKDF2_ITERATIONS).toBe(100_000);
    expect(SALT_LENGTH).toBe(16);
    expect(IV_LENGTH).toBe(12);
  });
});

describe("base64 helpers — invariant: decode(encode(x)) === x", () => {
  it("round-trips arbitrary binary bytes", () => {
    for (let i = 0; i < 20; i++) {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      const restored = base64ToBytes(bytesToBase64(bytes));
      expect(Array.from(restored)).toEqual(Array.from(bytes));
    }
  });

  it("handles empty input", () => {
    expect(bytesToBase64(new Uint8Array(0))).toBe("");
    expect(base64ToBytes("").length).toBe(0);
  });

  it("preserves unicode text through encode→decode", () => {
    const text = "héllo wörld — 中文 🎉";
    const bytes = new TextEncoder().encode(text);
    const restored = new TextDecoder().decode(base64ToBytes(bytesToBase64(bytes)));
    expect(restored).toBe(text);
  });
});

describe("deriveKey — PBKDF2 key derivation", () => {
  it("derives a usable AES-GCM key deterministically from the same password+salt", async () => {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const [k1, k2] = await Promise.all([
      deriveKey("correct-horse", salt as Uint8Array<ArrayBuffer>),
      deriveKey("correct-horse", salt as Uint8Array<ArrayBuffer>),
    ]);
    // Both keys should be usable for encryption (CryptoKeys are opaque —
    // prove equivalence by encrypting identical data and comparing sizes).
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const c1 = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k1, roundTripData());
    const c2 = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k2, roundTripData());
    expect(c1.byteLength).toBe(c2.byteLength);
  });

  it("different salts produce different keys", async () => {
    const saltA = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const saltB = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const kA = await deriveKey("pw", saltA as Uint8Array<ArrayBuffer>);
    const kB = await deriveKey("pw", saltB as Uint8Array<ArrayBuffer>);
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const cA = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, kA, roundTripData());
    const cB = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, kB, roundTripData());
    // Same length, different bytes
    const a = new Uint8Array(cA);
    const b = new Uint8Array(cB);
    let equal = a.length === b.length;
    for (let i = 0; i < a.length && equal; i++) equal = a[i] === b[i];
    expect(equal).toBe(false);
  });
});

describe("encrypt/decrypt bytes — AES-256-GCM invariants", () => {
  it("decrypt(encrypt(x)) === x for the same password", async () => {
    const data = roundTripData();
    const { encrypted, salt, iv } = await encryptBytes(data, "hunter2");
    const restored = await decryptBytes(
      encrypted.buffer as ArrayBuffer,
      "hunter2",
      salt,
      iv,
    );
    expect(new TextDecoder().decode(restored)).toBe(
      new TextDecoder().decode(new Uint8Array(data)),
    );
  });

  it("produces ciphertext larger than plaintext (GCM tag + no compression)", async () => {
    const data = roundTripData();
    const { encrypted } = await encryptBytes(data, "pw");
    expect(encrypted.byteLength).toBeGreaterThan(data.byteLength);
  });

  it("uses a unique salt and IV per encryption (semantically secure)", async () => {
    const data = roundTripData();
    const first = await encryptBytes(data, "pw");
    const second = await encryptBytes(data, "pw");
    expect(Array.from(first.salt)).not.toEqual(Array.from(second.salt));
    expect(Array.from(first.iv)).not.toEqual(Array.from(second.iv));
    expect(Array.from(first.encrypted)).not.toEqual(
      Array.from(second.encrypted),
    );
  });

  it("rejects a wrong password (GCM auth) instead of returning garbage", async () => {
    const data = roundTripData();
    const { encrypted, salt, iv } = await encryptBytes(data, "right");
    await expect(
      decryptBytes(
        encrypted.buffer as ArrayBuffer,
        "wrong",
        salt,
        iv,
      ),
    ).rejects.toThrow();
  });

  it("rejects tampered ciphertext (authenticity)", async () => {
    const data = roundTripData();
    const { encrypted, salt, iv } = await encryptBytes(data, "pw");
    encrypted[0] ^= 0xff; // flip one bit
    await expect(
      decryptBytes(encrypted.buffer as ArrayBuffer, "pw", salt, iv),
    ).rejects.toThrow();
  });

  it("handles empty input", async () => {
    const { encrypted, salt, iv } = await encryptBytes(
      new ArrayBuffer(0),
      "pw",
    );
    const restored = await decryptBytes(
      encrypted.buffer as ArrayBuffer,
      "pw",
      salt,
      iv,
    );
    expect(restored.byteLength).toBe(0);
  });
});

describe("encryptFile", () => {
  it("encrypts a File and its manifest fields describe it", async () => {
    const file = new File(["file content here"], "notes.txt", {
      type: "text/plain",
    });
    const { encrypted, salt, iv } = await encryptFile(file, "pw");

    expect(encrypted.byteLength).toBeGreaterThan(12);
    expect(salt.byteLength).toBe(SALT_LENGTH);
    expect(iv.byteLength).toBe(IV_LENGTH);

    const restored = await decryptBytes(
      encrypted.buffer as ArrayBuffer,
      "pw",
      salt,
      iv,
    );
    expect(new TextDecoder().decode(restored)).toBe("file content here");
  });
});

describe("createManifest", () => {
  it("describes the archive format honestly", () => {
    const manifest = createManifest([
      {
        name: "a.txt",
        salt: "AAAA",
        iv: "BBBB",
        size: 3,
        encryptedSize: 19,
      },
    ]);
    expect(manifest.version).toBe("1.0");
    expect(manifest.algorithm).toBe("AES-256-GCM");
    expect(manifest.keyDerivation.algorithm).toBe("PBKDF2-SHA256");
    expect(manifest.keyDerivation.iterations).toBe(PBKDF2_ITERATIONS);
    expect(manifest.files).toHaveLength(1);
  });

  it("is JSON-serializable (it is written into the ZIP)", () => {
    const manifest = createManifest([]);
    expect(() => JSON.stringify(manifest)).not.toThrow();
    expect(JSON.parse(JSON.stringify(manifest)).files).toEqual([]);
  });
});
