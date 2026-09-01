"use client";

import { useState } from "react";
import { parse, formatCss, formatHex, formatRgb, formatHsl, oklch } from "culori";
import { roundColor } from "./culori-utils";
import type { ToolComponentProps } from "@/tools/tool-props";
import {
  ToolActions,
  ToolContainer,
  ToolInput,
  ToolOutput,
  ToolSelect,
} from "@/components/tool-forms";

type Target = "oklch" | "hex" | "rgb" | "hsl";



const TARGETS: { label: string; value: Target }[] = [
  { label: "OKLCH", value: "oklch" },
  { label: "HEX", value: "hex" },
  { label: "RGB", value: "rgb" },
  { label: "HSL", value: "hsl" },
];

const SAMPLE = `:root {
  --primary: #6366f1;
  --primary-foreground: #ffffff;
  --muted: oklch(0.97 0.001 286);
  --radius: 8px;
  --font-sans: system-ui, sans-serif;
}`;



function convertColor(value: string, target: Target): string | null {
  const parsed = parse(value);
  if (!parsed) return null;
  try {
    switch (target) {
      case "oklch":
        return formatCss(roundColor(oklch(parsed), 3));
      case "hex":
        return formatHex(parsed);
      case "rgb":
        return formatRgb(parsed);
      case "hsl":
        return formatHsl(parsed);
    }
  } catch {
    return null;
  }
}

export function CssColorVarsConverter({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [target, setTarget] = useState<Target>("oklch");
  const [output, setOutput] = useState("");
  const [statsText, setStatsText] = useState<string | null>(null);

  const handleConvert = () => {
    const lines = input.split("\n");
    let convertedCount = 0;
    let skippedCount = 0;

    const result = lines
      .map((line) => {
        // Match --name: value; declarations (trailing ; optional)
        const match = line.match(/^(\s*)(--[a-zA-Z0-9-]+\s*:\s*)(.+?)(;?)(\s*)$/);
        if (!match) return line;

        const [, indent, declaration, rawValue, semicolon] = match;
        const cleanedValue = rawValue.trim();

        // Skip non-color values early
        const parsedValue = parse(cleanedValue);
        if (!parsedValue) {
          skippedCount++;
          return line;
        }

        const converted = convertColor(cleanedValue, target);
        if (converted === null) return line;

        if (converted.toLowerCase() !== cleanedValue.toLowerCase()) {
          convertedCount++;
        }
        return `${indent}${declaration}${converted}${semicolon}`;
      })
      .join("\n");

    setOutput(result);
    setStatsText(
      `Converted ${convertedCount} color${convertedCount === 1 ? "" : "s"} to ${target.toUpperCase()}${skippedCount > 0 ? ` · ${skippedCount} non-color value${skippedCount === 1 ? "" : "s"} kept as-is` : ""}`,
    );
  };

  const handleClear = () => {
    setInput("");
    setOutput("");
    setStatsText(null);
  };

  return (
    <ToolContainer>
      <ToolInput
        id="css-vars-input"
        label="CSS custom properties"
        value={input}
        onChange={setInput}
        placeholder={SAMPLE}
        rows={10}
      />

      <ToolSelect
        label="Convert colors to"
        value={target}
        onValueChange={(v) => setTarget(v as Target)}
        options={TARGETS}
        help="Non-color values (radii, fonts, z-index) are preserved untouched."
      />

      <ToolActions
        onRun={handleConvert}
        onClear={handleClear}
        runLabel="Convert vars"
        disabled={!input.trim()}
      />

      {statsText && output && (
        <p className="text-sm text-muted-foreground">{statsText}</p>
      )}

      {output && (
        <ToolOutput
          id="css-vars-output"
          label="Converted CSS"
          value={output}
          filename="vars.css"
          mimeType="text/css"
        />
      )}
    </ToolContainer>
  );
}
