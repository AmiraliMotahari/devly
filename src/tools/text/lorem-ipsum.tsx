"use client";

import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";
import {
  ToolActions,
  ToolContainer,
  ToolOutput,
  ToolRow,
  ToolSelect,
} from "@/components/tool-forms";

const WORDS = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing",
  "elit", "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore",
  "et", "dolore", "magna", "aliqua", "enim", "ad", "minim", "veniam",
  "quis", "nostrud", "exercitation", "ullamco", "laboris", "nisi",
  "aliquip", "ex", "ea", "commodo", "consequat", "duis", "aute",
  "irure", "in", "reprehenderit", "voluptate", "velit", "esse",
  "cillum", "fugiat", "nulla", "pariatur", "excepteur", "sint",
  "occaecat", "cupidatat", "non", "proident", "sunt", "culpa",
  "officia", "deserunt", "mollit", "anim", "id", "est", "laborum",
];

function randomWords(count: number): string[] {
  const random = new Uint32Array(count);
  crypto.getRandomValues(random);
  return Array.from(random, (r) => WORDS[r % WORDS.length]);
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

type Unit = "paragraphs" | "sentences" | "words";

export function LoremIpsum({}: ToolComponentProps) {
  const [unit, setUnit] = useState<Unit>("paragraphs");
  const [count, setCount] = useState(3);
  const [output, setOutput] = useState("");

  const handleGenerate = () => {
    const n = Math.min(100, Math.max(1, count));

    if (unit === "words") {
      setOutput(randomWords(n).join(" "));
      return;
    }

    if (unit === "sentences") {
      const sentences: string[] = [];
      for (let i = 0; i < n; i++) {
        const len = 8 + (crypto.getRandomValues(new Uint32Array(1))[0] % 8);
        const words = randomWords(len);
        words[0] = capitalize(words[0]);
        sentences.push(words.join(" ") + ".");
      }
      setOutput(sentences.join(" "));
      return;
    }

    // paragraphs
    const paragraphs: string[] = [];
    for (let i = 0; i < n; i++) {
      const sentences: string[] = [];
      const sentenceCount = 3 + (crypto.getRandomValues(new Uint32Array(1))[0] % 3);
      for (let s = 0; s < sentenceCount; s++) {
        const len = 8 + (crypto.getRandomValues(new Uint32Array(1))[0] % 8);
        const words = randomWords(len);
        words[0] = capitalize(words[0]);
        sentences.push(words.join(" ") + ".");
      }
      // Start with the classic opening for the first paragraph
      if (i === 0) {
        sentences[0] =
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
      }
      paragraphs.push(sentences.join(" "));
    }
    setOutput(paragraphs.join("\n\n"));
  };

  return (
    <ToolContainer>
      <ToolRow>
        <ToolSelect
          label="Generate"
          value={unit}
          onValueChange={(v) => setUnit(v as Unit)}
          options={[
            { label: "Paragraphs", value: "paragraphs" },
            { label: "Sentences", value: "sentences" },
            { label: "Words", value: "words" },
          ]}
        />
        <div className="flex flex-col gap-2">
          <label htmlFor="li-count" className="text-sm font-medium">
            Count (1-100)
          </label>
          <input
            id="li-count"
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) =>
              setCount(Math.min(100, Math.max(1, Number(e.target.value))))
            }
            className="h-9 w-24 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
      </ToolRow>

      <ToolActions
        onRun={handleGenerate}
        onClear={() => setOutput("")}
        runLabel="Generate"
      />

      {output && (
        <ToolOutput
          id="li-output"
          label="Lorem ipsum"
          value={output}
          filename="lorem.txt"
          mimeType="text/plain"
        />
      )}
    </ToolContainer>
  );
}
