export const PBKDF2_ITERATIONS = 100_000;
export const AES_KEY_LENGTH = 256;
export const SALT_LENGTH = 16;
export const IV_LENGTH = 12;

export const MANIFEST_FILENAME = "MANIFEST.json";
export const ENCRYPTED_EXTENSION = ".enc";
export const MANIFEST_VERSION = "1.0";

export interface ManifestEntry {
  name: string;
  salt: string;
  iv: string;
  size: number;
  encryptedSize: number;
}

export interface EncryptedArchiveManifest {
  version: typeof MANIFEST_VERSION;
  algorithm: "AES-256-GCM";
  keyDerivation: {
    algorithm: "PBKDF2-SHA256";
    iterations: number;
  };
  files: ManifestEntry[];
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

export async function deriveKey(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number = PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
  const encoder = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: AES_KEY_LENGTH,
    },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptBytes(
  data: ArrayBuffer,
  password: string,
): Promise<{
  encrypted: Uint8Array<ArrayBuffer>;
  salt: Uint8Array<ArrayBuffer>;
  iv: Uint8Array<ArrayBuffer>;
}> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const key = await deriveKey(password, salt);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data,
  );

  return {
    encrypted: new Uint8Array(encrypted),
    salt,
    iv,
  };
}

export async function decryptBytes(
  encrypted: ArrayBuffer,
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iv: Uint8Array<ArrayBuffer>,
  iterations: number = PBKDF2_ITERATIONS,
): Promise<Uint8Array<ArrayBuffer>> {
  const key = await deriveKey(password, salt, iterations);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encrypted,
  );

  return new Uint8Array(decrypted);
}

export function createManifest(
  entries: ManifestEntry[],
): EncryptedArchiveManifest {
  return {
    version: MANIFEST_VERSION,
    algorithm: "AES-256-GCM",
    keyDerivation: {
      algorithm: "PBKDF2-SHA256",
      iterations: PBKDF2_ITERATIONS,
    },
    files: entries,
  };
}

export async function encryptFile(
  file: File,
  password: string,
): Promise<{
  encrypted: Uint8Array<ArrayBuffer>;
  salt: Uint8Array<ArrayBuffer>;
  iv: Uint8Array<ArrayBuffer>;
}> {
  const data = await file.arrayBuffer();
  return encryptBytes(data, password);
}
