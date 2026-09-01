"use client";

import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";
import {
  ToolActions,
  ToolContainer,
  ToolField,
} from "@/components/tool-forms";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Check, Copy } from "lucide-react";

const BASES = [
  { base: 2, label: "Binary (2)", pattern: /^[01]+$/, prefix: "0b" },
  { base: 8, label: "Octal (8)", pattern: /^[0-7]+$/, prefix: "0o" },
  { base: 10, label: "Decimal (10)", pattern: /^\d+$/, prefix: "" },
  { base: 16, label: "Hexadecimal (16)", pattern: /^[0-9a-f]+$/i, prefix: "0x" },
];

const DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz";

export function BaseConverter({}: ToolComponentProps) {
  const [fromBase, setFromBase] = useState(10);
  const [value, setValue] = useState("");
  const [outputs, setOutputs] = useState<Record<number, string> | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<number | null>(null);

  const parseInBase = (input: string, base: number): number | null => {
    const clean = input
      .trim()
      .toLowerCase()
      .replace(/^0x/, "")
      .replace(/^0b/, "")
      .replace(/^0o/, "");
    if (!clean) return null;
    for (const ch of clean) {
      const digit = DIGITS.indexOf(ch);
      if (digit < 0 || digit >= base) return null;
    }
    const parsed = parseInt(clean, base);
    return Number.isSafeInteger(parsed) ? parsed : null;
  };

  const handleConvert = () => {
    setError("");
    setOutputs(null);

    const num = parseInBase(value, fromBase);
    if (num === null) {
      setError(
        `"${value}" is not a valid base-${fromBase} number (or exceeds the safe integer range).`,
      );
      return;
    }

    const result: Record<number, string> = {};
    for (const { base } of BASES) {
      result[base] = num.toString(base);
    }
    setOutputs(result);
  };

  const copy = async (base: number) => {
    if (!outputs) return;
    try {
      await navigator.clipboard.writeText(outputs[base]);
      setCopied(base);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Could not copy — clipboard unavailable");
    }
  };

  const fromOptions = BASES.map((b) => ({
    label: b.label,
    value: String(b.base),
  }));

  return (
    <ToolContainer>
      <ToolField label="Input number" htmlFor="bc-value" help={`Digits valid in base ${fromBase}`}>
        <div className="flex gap-2">
          <select
            id="bc-from"
            value={fromBase}
            onChange={(e) => setFromBase(Number(e.target.value))}
            className="h-9 w-40 rounded-md border border-input bg-background px-3 text-sm"
            aria-label="Input base"
          >
            {fromOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <Input
            id="bc-value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={fromBase === 16 ? "e.g. ff or 0xff" : "e.g. 42"}
            className="flex-1 font-mono"
          />
        </div>
      </ToolField>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <ToolActions
        onRun={handleConvert}
        onClear={() => {
          setValue("");
          setOutputs(null);
          setError("");
        }}
        runLabel="Convert"
        disabled={!value.trim()}
      />

      {outputs && (
        <ToolField label="Conversions">
          <div className="flex flex-col gap-2">
            {BASES.map(({ base, label }) => (
              <Card key={base}>
                <CardContent className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-mono text-sm">{outputs[base]}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copy(base)}
                    aria-label={`Copy base-${base} value`}
                    className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {copied === base ? (
                      <Check className="size-4 text-success" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        </ToolField>
      )}
    </ToolContainer>
  );
}
