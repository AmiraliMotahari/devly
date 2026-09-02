"use client";

import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";
import {
  ToolActions,
  ToolCheckbox,
  ToolContainer,
  ToolField,
  ToolRow,
  ToolSelect,
} from "@/components/tool-forms";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CopyToClipboard } from "@/components/copy-to-clipboard";
import { CodeBlock } from "@/components/code-block";

const CHARSETS = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  numbers: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>?",
};

function generatePassword(
  length: number,
  sets: { lowercase: boolean; uppercase: boolean; numbers: boolean; symbols: boolean },
  excludeSimilar: boolean,
): string {
  const similar = "il1Lo0O";
  let pool = "";
  const guaranteed: string[] = [];

  for (const [name, enabled] of Object.entries(sets)) {
    if (!enabled) continue;
    let chars = CHARSETS[name as keyof typeof CHARSETS];
    if (excludeSimilar) {
      chars = chars.split("").filter((c) => !similar.includes(c)).join("");
    }
    pool += chars;
    if (chars.length > 0) {
      guaranteed.push(chars[crypto.getRandomValues(new Uint32Array(1))[0] % chars.length]);
    }
  }

  if (pool.length === 0) return "";

  const random = new Uint32Array(length);
  crypto.getRandomValues(random);
  const chars = Array.from(random, (r) => pool[r % pool.length]);

  // Ensure at least one char from each enabled set
  for (let i = 0; i < guaranteed.length && i < length; i++) {
    const pos = random[i] % length;
    chars[pos] = guaranteed[i];
  }

  return chars.slice(0, length).join("");
}

function estimateEntropy(length: number, poolSize: number): number {
  return Math.round(length * Math.log2(Math.max(poolSize, 2)));
}

export function PasswordGenerator({}: ToolComponentProps) {
  const [length, setLength] = useState(16);
  const [sets, setSets] = useState({
    lowercase: true,
    uppercase: true,
    numbers: true,
    symbols: true,
  });
  const [excludeSimilar, setExcludeSimilar] = useState(false);
  const [password, setPassword] = useState("");

  const poolSize = Object.entries(sets)
    .filter(([, enabled]) => enabled)
    .reduce((size, [name]) => {
      let chars = CHARSETS[name as keyof typeof CHARSETS];
      if (excludeSimilar) {
        chars = chars.split("").filter((c) => !"il1Lo0O".includes(c)).join("");
      }
      return size + chars.length;
    }, 0);

  const entropy = estimateEntropy(password.length || length, poolSize);
  const strength =
    entropy >= 100 ? "Excellent" : entropy >= 80 ? "Strong" : entropy >= 60 ? "Good" : entropy >= 40 ? "Fair" : "Weak";
  const strengthColor =
    entropy >= 80 ? "text-success" : entropy >= 60 ? "text-warning" : "text-destructive";

  const handleGenerate = () => {
    const pwd = generatePassword(length, sets, excludeSimilar);
    if (!pwd) {
      toast.error("Select at least one character set");
      return;
    }
    setPassword(pwd);
  };

  return (
    <ToolContainer>
      <ToolRow>
        <div className="flex flex-col gap-2">
          <label htmlFor="pwd-length" className="text-sm font-medium">Length</label>
          <Input
            id="pwd-length"
            type="number"
            min={4}
            max={128}
            value={length}
            onChange={(e) =>
              setLength(Math.min(128, Math.max(4, Number(e.target.value))))
            }
            className="w-24"
          />
        </div>
        <ToolSelect
          label="Preset"
          value=""
          onValueChange={(v) => {
            if (v === "pin") {
              setLength(6); setSets({ lowercase: false, uppercase: false, numbers: true, symbols: false });
            } else if (v === "memorable") {
              setLength(24); setSets({ lowercase: true, uppercase: true, numbers: true, symbols: false }); setExcludeSimilar(true);
            } else if (v === "max") {
              setLength(64); setSets({ lowercase: true, uppercase: true, numbers: true, symbols: true });
            }
          }}
          options={[
            { label: "Choose preset…", value: "" },
            { label: "6-digit PIN", value: "pin" },
            { label: "Memorable (24, no look-alikes)", value: "memorable" },
            { label: "Maximum security (64)", value: "max" },
          ]}
        />
      </ToolRow>

      <ToolRow>
        <ToolCheckbox
          label="Lowercase (a-z)"
          checked={sets.lowercase}
          onCheckedChange={(v) => setSets((s) => ({ ...s, lowercase: v }))}
        />
        <ToolCheckbox
          label="Uppercase (A-Z)"
          checked={sets.uppercase}
          onCheckedChange={(v) => setSets((s) => ({ ...s, uppercase: v }))}
        />
        <ToolCheckbox
          label="Numbers (0-9)"
          checked={sets.numbers}
          onCheckedChange={(v) => setSets((s) => ({ ...s, numbers: v }))}
        />
        <ToolCheckbox
          label="Symbols (!@#$…)"
          checked={sets.symbols}
          onCheckedChange={(v) => setSets((s) => ({ ...s, symbols: v }))}
        />
        <ToolCheckbox
          label="Exclude look-alikes (il1Lo0O)"
          checked={excludeSimilar}
          onCheckedChange={setExcludeSimilar}
        />
      </ToolRow>

      <ToolActions onRun={handleGenerate} runLabel="Generate password" />

      {password && (
        <ToolField
          label="Password"
          help={`~${entropy} bits of entropy · ${strength}`}
        >
          <div className="flex items-center gap-2">
             <CodeBlock code={password} language="text" />
            <CopyToClipboard
              value={password}
              variant="ghost"
              size="icon"
              aria-label="Copy password"
            />
          </div>
          <p className={`text-sm font-medium ${strengthColor}`}>{strength}</p>
        </ToolField>
      )}
    </ToolContainer>
  );
}
