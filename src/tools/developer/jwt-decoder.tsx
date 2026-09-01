"use client";

import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";
import { ToolActions, ToolContainer, ToolError, ToolInput } from "@/components/tool-forms";
import { ToolOutput } from "@/components/tool-forms";

function base64UrlDecode(input: string): string {
  const padded = input + "=".repeat((4 - (input.length % 4)) % 4);
  const decoded = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return decodeURIComponent(
    decoded
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join(""),
  );
}

function formatJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

export function JwtDecoder({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [header, setHeader] = useState("");
  const [payload, setPayload] = useState("");
  const [signature, setSignature] = useState("");
  const [error, setError] = useState("");

  const handleDecode = () => {
    try {
      setError("");
      setHeader("");
      setPayload("");
      setSignature("");

      if (!input.trim()) {
        setError("Please enter a JWT token");
        return;
      }

      const parts = input.trim().split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid JWT format. Expected 3 parts separated by dots.");
      }

      const decodedHeader = base64UrlDecode(parts[0]);
      const decodedPayload = base64UrlDecode(parts[1]);
      const decodedSignature = parts[2];

      setHeader(formatJson(decodedHeader));
      setPayload(formatJson(decodedPayload));
      setSignature(decodedSignature);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to decode JWT");
    }
  };

  const handleClear = () => {
    setInput("");
    setHeader("");
    setPayload("");
    setSignature("");
    setError("");
  };

  return (
    <ToolContainer>
      <ToolInput
        id="jwt-input"
        label="JWT Token"
        value={input}
        onChange={setInput}
        placeholder="Paste your JWT token here (e.g. eyJhbGciOi...)"
        rows={5}
      />

      {error && <ToolError message={error} />}

      <ToolActions
        onRun={handleDecode}
        onClear={handleClear}
        runLabel="Decode"
        disabled={!input.trim()}
      />

      {header && (
        <ToolOutput
          id="jwt-header"
          label="Header (Algorithm & Token Type)"
          value={header}
          filename="header.json"
          mimeType="application/json"
        />
      )}

      {payload && (
        <ToolOutput
          id="jwt-payload"
          label="Payload (Data / Claims)"
          value={payload}
          filename="payload.json"
          mimeType="application/json"
        />
      )}

      {signature && (
        <ToolOutput
          id="jwt-signature"
          label="Signature (Base64Url encoded)"
          value={signature}
          filename="signature.txt"
          mimeType="text/plain"
        />
      )}
    </ToolContainer>
  );
}
