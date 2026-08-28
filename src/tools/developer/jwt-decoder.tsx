import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";

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

function base64UrlEncode(input: string): string {
  const utf8 = unescape(encodeURIComponent(input));
  return btoa(utf8).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="tool-container space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">JWT Token</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste your JWT token here (e.g. eyJhbGciOi...)"
          className="w-full h-32 p-3 border rounded font-mono text-sm break-all"
        />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        onClick={handleDecode}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Decode
      </button>

      {(header || payload || signature) && (
        <div className="space-y-4">
          {header && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Header (Algorithm & Token Type)</label>
                <button
                  onClick={() => handleCopy(header)}
                  className="text-xs text-blue-500 hover:underline"
                >
                  Copy
                </button>
              </div>
              <pre className="w-full p-3 border rounded overflow-auto font-mono text-xs bg-gray-50 max-h-40">
                {header}
              </pre>
            </div>
          )}

          {payload && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Payload (Data / Claims)</label>
                <button
                  onClick={() => handleCopy(payload)}
                  className="text-xs text-blue-500 hover:underline"
                >
                  Copy
                </button>
              </div>
              <pre className="w-full p-3 border rounded overflow-auto font-mono text-xs bg-gray-50 max-h-60">
                {payload}
              </pre>
            </div>
          )}

          {signature && (
            <div>
              <label className="text-sm font-medium mb-2 block">
                Signature (Base64Url encoded)
              </label>
              <pre className="w-full p-3 border rounded overflow-auto font-mono text-xs break-all bg-gray-50 max-h-32">
                {signature}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
