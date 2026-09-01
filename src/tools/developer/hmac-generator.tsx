"use client";

import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";
import {
  ToolActions,
  ToolContainer,
  ToolField,
  ToolInput,
  ToolRow,
  ToolSelect,
} from "@/components/tool-forms";
import { CopyToClipboard } from "@/components/copy-to-clipboard";

type HashName = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";

const ALGORITHMS: { label: string; value: HashName }[] = [
  { label: "SHA-1", value: "SHA-1" },
  { label: "SHA-256", value: "SHA-256" },
  { label: "SHA-384", value: "SHA-384" },
  { label: "SHA-512", value: "SHA-512" },
];

const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function HmacGenerator({}: ToolComponentProps) {
  const [message, setMessage] = useState("");
  const [secret, setSecret] = useState("");
  const [algorithm, setAlgorithm] = useState<HashName>("SHA-256");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    setError("");
    setOutput("");

    if (!message.trim()) {
      setError("Please enter a message");
      return;
    }
    if (!secret) {
      setError("Please enter a secret key");
      return;
    }

    try {
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: algorithm },
        false,
        ["sign"],
      );
      const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(message),
      );
      setOutput(toHex(signature));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate HMAC",
      );
    }
  };

  return (
    <ToolContainer>
      <ToolInput
        id="hmac-message"
        label="Message"
        value={message}
        onChange={setMessage}
        placeholder="Enter the message to authenticate..."
        rows={6}
      />

      <ToolInput
        id="hmac-secret"
        label="Secret key"
        value={secret}
        onChange={setSecret}
        placeholder="Enter the shared secret key..."
        rows={3}
      />

      <ToolRow>
        <ToolSelect
          label="Algorithm"
          value={algorithm}
          onValueChange={(v) => setAlgorithm(v as HashName)}
          options={ALGORITHMS}
        />
      </ToolRow>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <ToolActions
        onRun={handleGenerate}
        runLabel="Generate HMAC"
        disabled={!message.trim() || !secret}
      />

      {output && (
        <ToolField label={`HMAC-${algorithm}`}>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded-md border bg-muted px-3 py-2 font-mono text-xs">
              {output}
            </code>
            <CopyToClipboard
              value={output}
              variant="ghost"
              size="icon"
              aria-label="Copy HMAC"
            />
          </div>
        </ToolField>
      )}
    </ToolContainer>
  );
}
