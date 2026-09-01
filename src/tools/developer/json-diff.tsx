"use client";

import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";
import {
  ToolActions,
  ToolContainer,
  ToolField,
  ToolInput,
} from "@/components/tool-forms";

interface DiffEntry {
  path: string;
  oldValue: string;
  newValue: string;
}

function flatten(value: unknown, prefix = "", out: Record<string, unknown> = {}): Record<string, unknown> {
  if (value === null || typeof value !== "object") {
    out[prefix || "value"] = value;
    return out;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) out[prefix] = [];
    value.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
    return out;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) out[prefix] = {};
  for (const [k, v] of entries) {
    flatten(v, prefix ? `${prefix}.${k}` : k, out);
  }
  return out;
}

function diffJson(a: unknown, b: unknown): DiffEntry[] {
  const flatA = flatten(a);
  const flatB = flatten(b);
  const allKeys = Array.from(new Set([...Object.keys(flatA), ...Object.keys(flatB)])).sort();
  const diffs: DiffEntry[] = [];

  for (const key of allKeys) {
    const inA = key in flatA;
    const inB = key in flatB;
    const valA = JSON.stringify(flatA[key] ?? null);
    const valB = JSON.stringify(flatB[key] ?? null);
    if (!inA) {
      diffs.push({ path: key, oldValue: "(absent)", newValue: valB });
    } else if (!inB) {
      diffs.push({ path: key, oldValue: valA, newValue: "(absent)" });
    } else if (valA !== valB) {
      diffs.push({ path: key, oldValue: valA, newValue: valB });
    }
  }
  return diffs;
}

export function JsonDiff({}: ToolComponentProps) {
  const [inputA, setInputA] = useState("");
  const [inputB, setInputB] = useState("");
  const [error, setError] = useState("");
  const [diffs, setDiffs] = useState<DiffEntry[] | null>(null);
  const [parseError, setParseError] = useState<{ which: string; message: string } | null>(null);

  const handleCompare = () => {
    setError("");
    setDiffs(null);
    setParseError(null);

    if (!inputA.trim() || !inputB.trim()) {
      setError("Please enter JSON in both fields");
      return;
    }

    let a: unknown;
    let b: unknown;
    try {
      a = JSON.parse(inputA);
    } catch (err) {
      setParseError({
        which: "First JSON",
        message: err instanceof Error ? err.message : "Invalid JSON",
      });
      return;
    }
    try {
      b = JSON.parse(inputB);
    } catch (err) {
      setParseError({
        which: "Second JSON",
        message: err instanceof Error ? err.message : "Invalid JSON",
      });
      return;
    }

    setDiffs(diffJson(a, b));
  };

  const handleClear = () => {
    setInputA("");
    setInputB("");
    setDiffs(null);
    setError("");
    setParseError(null);
  };

  return (
    <ToolContainer>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ToolInput
          id="json-a"
          label="First JSON"
          value={inputA}
          onChange={setInputA}
          placeholder='{"name":"Alice","age":30}'
          rows={8}
        />
        <ToolInput
          id="json-b"
          label="Second JSON"
          value={inputB}
          onChange={setInputB}
          placeholder='{"name":"Alice","age":31}'
          rows={8}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {parseError && (
        <p className="text-sm text-destructive">
          {parseError.which}: {parseError.message}
        </p>
      )}

      <ToolActions
        onRun={handleCompare}
        onClear={handleClear}
        runLabel="Compare"
        disabled={!inputA.trim() || !inputB.trim()}
      />

      {diffs && (
        <ToolField label={diffs.length === 0 ? "Result" : `${diffs.length} difference${diffs.length === 1 ? "" : "s"} found`}>
          {diffs.length === 0 ? (
            <p className="rounded-md border bg-success/5 p-3 text-sm text-success">
              The two JSON documents are identical.
            </p>
          ) : (
            <div className="max-h-96 overflow-auto rounded-md border font-mono text-xs">
              <table className="w-full">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Path</th>
                    <th className="px-3 py-2 text-left font-medium">First</th>
                    <th className="px-3 py-2 text-left font-medium">Second</th>
                  </tr>
                </thead>
                <tbody>
                  {diffs.map((d, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2 font-mono">{d.path}</td>
                      <td className="bg-destructive/10 px-3 py-2 font-mono text-destructive">
                        {d.oldValue}
                      </td>
                      <td className="bg-success/10 px-3 py-2 font-mono text-success">
                        {d.newValue}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ToolField>
      )}
    </ToolContainer>
  );
}
