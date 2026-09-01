"use client";

import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";
import {
  ToolActions,
  ToolCheckbox,
  ToolContainer,
  ToolInput,
  ToolOutput,
  ToolRow,
  ToolSelect,
} from "@/components/tool-forms";

type SortMode = "az" | "za" | "length" | "length-desc" | "natural" | "shuffle";

const MODES: { label: string; value: SortMode }[] = [
  { label: "A → Z", value: "az" },
  { label: "Z → A", value: "za" },
  { label: "Length (short → long)", value: "length" },
  { label: "Length (long → short)", value: "length-desc" },
  { label: "Natural (numeric-aware)", value: "natural" },
  { label: "Shuffle (random)", value: "shuffle" },
];

function collator(): Intl.Collator {
  return new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
}

export function SortLines({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<SortMode>("az");
  const [caseInsensitive, setCaseInsensitive] = useState(true);
  const [output, setOutput] = useState("");
  const [isCaseSensitiveError, setIsCaseSensitiveError] = useState(false);

  const handleSort = () => {
    const lines = input.split("\n");
    const natural = collator();

    let sorted: string[];
    switch (mode) {
      case "az":
        sorted = [...lines].sort((a, b) =>
          caseInsensitive
            ? natural.compare(a, b)
            : a.localeCompare(b),
        );
        break;
      case "za":
        sorted = [...lines].sort((a, b) =>
          caseInsensitive
            ? natural.compare(b, a)
            : b.localeCompare(a),
        );
        break;
      case "length":
        sorted = [...lines].sort(
          (a, b) => a.length - b.length || natural.compare(a, b),
        );
        break;
      case "length-desc":
        sorted = [...lines].sort(
          (a, b) => b.length - a.length || natural.compare(a, b),
        );
        break;
      case "natural":
        sorted = [...lines].sort((a, b) => natural.compare(a, b));
        break;
      case "shuffle": {
        const arr = [...lines];
        const random = new Uint32Array(arr.length);
        crypto.getRandomValues(random);
        for (let i = arr.length - 1; i > 0; i--) {
          const j = random[i] % (i + 1);
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        sorted = arr;
        break;
      }
    }

    setOutput(sorted.join("\n"));
    setIsCaseSensitiveError(!caseInsensitive && mode === "natural");
  };

  const handleClear = () => {
    setInput("");
    setOutput("");
  };

  return (
    <ToolContainer>
      <ToolInput
        id="sort-input"
        label="Input"
        value={input}
        onChange={setInput}
        placeholder="One item per line..."
        rows={10}
      />

      <ToolRow>
        <ToolSelect
          label="Sort mode"
          value={mode}
          onValueChange={(v) => setMode(v as SortMode)}
          options={MODES}
        />
        {mode !== "natural" && mode !== "shuffle" && (
          <ToolCheckbox
            label="Case-insensitive"
            checked={caseInsensitive}
            onCheckedChange={setCaseInsensitive}
          />
        )}
      </ToolRow>

      {isCaseSensitiveError && (
        <p className="text-xs text-muted-foreground">
          Natural sort is always case-insensitive.
        </p>
      )}

      <ToolActions
        onRun={handleSort}
        onClear={handleClear}
        runLabel="Sort lines"
        disabled={!input.trim()}
      />

      {output && (
        <ToolOutput
          id="sort-output"
          label="Sorted lines"
          value={output}
          filename="sorted.txt"
          mimeType="text/plain"
        />
      )}
    </ToolContainer>
  );
}
