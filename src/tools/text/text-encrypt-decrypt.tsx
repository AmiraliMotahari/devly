"use client";

import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";
import {
  ToolActions,
  ToolContainer,
  ToolError,
  ToolField,
  ToolInput,
  ToolOutput,
  ToolRow,
  ToolSelect,
} from "@/components/tool-forms";
import { Input } from "@/components/ui/input";
import {
  bytesToBase64,
  base64ToBytes,
  decryptBytes,
  encryptBytes,
} from "@/tools/files/encrypted-archive";

type Mode = "encrypt" | "decrypt";

const ENVELOPE_PREFIX = "devly-v1:";

interface Envelope {
  salt: Uint8Array<ArrayBuffer>;
  iv: Uint8Array<ArrayBuffer>;
  ciphertext: Uint8Array<ArrayBuffer>;
}

function encodeEnvelope({ salt, iv, ciphertext }: {
  salt: Uint8Array<ArrayBuffer>;
  iv: Uint8Array<ArrayBuffer>;
  ciphertext: Uint8Array<ArrayBuffer>;
}): string {
  return [
    ENVELOPE_PREFIX,
    bytesToBase64(salt),
    bytesToBase64(iv),
    bytesToBase64(ciphertext),
  ].join(".");
}

function decodeEnvelope(input: string): Envelope {
  const parts = input.trim().split(".");

  if (parts.length !== 4 || parts[0] !== ENVELOPE_PREFIX) {
    throw new Error(
      "Not a valid encrypted message. Expected format: devly-v1:<salt>.<iv>.<ciphertext>",
    );
  }

  try {
    return {
      salt: base64ToBytes(parts[1]) as Uint8Array<ArrayBuffer>,
      iv: base64ToBytes(parts[2]) as Uint8Array<ArrayBuffer>,
      ciphertext: base64ToBytes(parts[3]) as Uint8Array<ArrayBuffer>,
    };
  } catch {
    throw new Error("Corrupted envelope — base64 payload is invalid.");
  }
}

async function encryptText(text: string, password: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const { encrypted, salt, iv } = await encryptBytes(
    data.buffer as ArrayBuffer,
    password,
  );
  return encodeEnvelope({ salt, iv, ciphertext: encrypted });
}

async function decryptText(envelope: string, password: string): Promise<string> {
  const { salt, iv, ciphertext } = decodeEnvelope(envelope);
  const decrypted = await decryptBytes(
    ciphertext.buffer as ArrayBuffer,
    password,
    salt,
    iv,
  );
  return new TextDecoder().decode(decrypted);
}

export function TextEncryptDecrypt({}: ToolComponentProps) {
  const [mode, setMode] = useState<Mode>("encrypt");
  const [text, setText] = useState("");
  const [password, setPassword] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const handleRun = async () => {
    setError("");
    setOutput("");

    if (!text.trim()) {
      setError("Please enter some text");
      return;
    }
    if (!password) {
      setError("Please enter a password");
      return;
    }

    try {
      if (mode === "encrypt") {
        setOutput(await encryptText(text, password));
      } else {
        setOutput(await decryptText(text, password));
      }
    } catch (err) {
      if (mode === "decrypt" && !text.includes(ENVELOPE_PREFIX)) {
        setError(
          "This doesn't look like an encrypted message. Encrypt text first, then paste the result here.",
        );
      } else {
        const message = err instanceof Error ? err.message.trim() : "";
        setError(
          message
            ? message
            : "Wrong password or corrupted message — decryption failed.",
        );
      }
    }
  };

  const handleClear = () => {
    setText("");
    setPassword("");
    setOutput("");
    setError("");
  };

  return (
    <ToolContainer>
      <ToolRow>
        <ToolSelect
          label="Mode"
          value={mode}
          onValueChange={(v) => {
            setMode(v as Mode);
            setOutput("");
            setError("");
          }}
          options={[
            { label: "Encrypt", value: "encrypt" },
            { label: "Decrypt", value: "decrypt" },
          ]}
        />
      </ToolRow>

      <ToolInput
        id="ted-text"
        label={mode === "encrypt" ? "Plain text" : "Encrypted message"}
        value={text}
        onChange={setText}
        placeholder={
          mode === "encrypt"
            ? "Enter the text to encrypt..."
            : "Paste the devly-v1:... message here..."
        }
        rows={6}
      />

      <ToolField label="Password" help="Never leaves your browser. AES-256-GCM + PBKDF2 (100k iterations).">
        <Input
          id="ted-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={
            mode === "encrypt"
              ? "Choose a strong password"
              : "Enter the password used to encrypt"
          }
          autoComplete={mode === "encrypt" ? "new-password" : "current-password"}
        />
      </ToolField>

      {error && <ToolError message={error} />}

      <ToolActions
        onRun={handleRun}
        onClear={handleClear}
        runLabel={mode === "encrypt" ? "Encrypt" : "Decrypt"}
        disabled={!text.trim() || !password}
      />

      {output && (
        <ToolOutput
          id="ted-output"
          label={mode === "encrypt" ? "Encrypted message" : "Decrypted text"}
          value={output}
          filename={mode === "encrypt" ? "encrypted-message.txt" : "decrypted-text.txt"}
          mimeType="text/plain"
        />
      )}
    </ToolContainer>
  );
}
