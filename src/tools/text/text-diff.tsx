"use client";

import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";
import { ToolContainer, ToolField } from "@/components/tool-forms";
import { CodeBlock } from "@/components/code-block";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DiffLine {
  type: "added" | "removed" | "unchanged" | "modified";
  oldContent?: string;
  newContent?: string;
  oldLineNum?: number;
  newLineNum?: number;
}

function diffLines(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const result: DiffLine[] = [];

  let i = 0;
  let j = 0;
  let oldLineNum = 0;
  let newLineNum = 0;

  while (i < oldLines.length || j < newLines.length) {
    if (i >= oldLines.length) {
      newLineNum++;
      result.push({ type: "added", newContent: newLines[j], newLineNum });
      j++;
      continue;
    }
    if (j >= newLines.length) {
      oldLineNum++;
      result.push({ type: "removed", oldContent: oldLines[i], oldLineNum });
      i++;
      continue;
    }
    if (oldLines[i] === newLines[j]) {
      oldLineNum++;
      newLineNum++;
      result.push({
        type: "unchanged",
        oldContent: oldLines[i],
        newContent: newLines[j],
        oldLineNum,
        newLineNum,
      });
      i++;
      j++;
      continue;
    }

    const oldInNew = newLines.slice(j + 1).indexOf(oldLines[i]);
    const newInOld = oldLines.slice(i + 1).indexOf(newLines[j]);

    if (oldInNew === -1 && newInOld === -1) {
      oldLineNum++;
      newLineNum++;
      result.push({
        type: "modified",
        oldContent: oldLines[i],
        newContent: newLines[j],
        oldLineNum,
        newLineNum,
      });
      i++;
      j++;
    } else if (oldInNew !== -1 && (newInOld === -1 || oldInNew <= newInOld)) {
      newLineNum++;
      result.push({ type: "added", newContent: newLines[j], newLineNum });
      j++;
    } else {
      oldLineNum++;
      result.push({ type: "removed", oldContent: oldLines[i], oldLineNum });
      i++;
    }
  }

  return result;
}

function diffWords(oldText: string, newText: string): { type: string; text: string }[] {
  const oldWords = oldText.split(/(\s+)/);
  const newWords = newText.split(/(\s+)/);
  const result: { type: string; text: string }[] = [];

  const m = oldWords.length;
  const n = newWords.length;
  const dp: number[][] = Array(m + 1)
    .fill(0)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (oldWords[i - 1] === newWords[j - 1]) {
      result.unshift({ type: "unchanged", text: oldWords[i - 1] });
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      result.unshift({ type: "removed", text: oldWords[i - 1] });
      i--;
    } else {
      result.unshift({ type: "added", text: newWords[j - 1] });
      j--;
    }
  }
  while (i > 0) {
    result.unshift({ type: "removed", text: oldWords[i - 1] });
    i--;
  }
  while (j > 0) {
    result.unshift({ type: "added", text: newWords[j - 1] });
    j--;
  }

  return result;
}

export function TextDiff({}: ToolComponentProps) {
  const [oldText, setOldText] = useState("");
  const [newText, setNewText] = useState("");
  const [mode, setMode] = useState<"line" | "word" | "unified">("line");

  const renderLineDiff = () => {
    if (!oldText && !newText) {
      return (
        <p className="text-sm text-muted-foreground">
          Enter text in both fields to see the difference.
        </p>
      );
    }
    const diff = diffLines(oldText, newText);
    return (
      <div className="border rounded font-mono text-xs overflow-auto max-h-96">
        {diff.map((line, idx) => (
          <div
            key={idx}
            className={`flex ${
              line.type === "added"
                ? "bg-green-50 dark:bg-green-950/30"
                : line.type === "removed"
                ? "bg-red-50 dark:bg-red-950/30"
                : line.type === "modified"
                ? "bg-warning/15"
                : ""
            }`}
          >
            <span className="w-10 text-right pr-2 text-muted-foreground border-r select-none">
              {line.oldLineNum ?? ""}
            </span>
            <span className="w-10 text-right pr-2 text-muted-foreground border-r select-none">
              {line.newLineNum ?? ""}
            </span>
            <span className="w-4 text-center select-none">
              {line.type === "added"
                ? "+"
                : line.type === "removed"
                ? "−"
                : line.type === "modified"
                ? "~"
                : " "}
            </span>
            <span className="flex-1 whitespace-pre-wrap break-all px-2">
              {line.type === "added" ? line.newContent : line.oldContent}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const renderWordDiff = () => {
    if (!oldText && !newText) {
      return (
        <p className="text-sm text-muted-foreground">
          Enter text in both fields to see the difference.
        </p>
      );
    }
    const diff = diffWords(oldText, newText);
    return (
      <div className="border rounded p-4 font-mono text-sm whitespace-pre-wrap break-words max-h-96 overflow-auto">
        {diff.map((part, idx) => (
          <span
            key={idx}
            className={
              part.type === "added"
                ? "bg-green-200 dark:bg-green-900 text-green-900 dark:text-green-100"
                : part.type === "removed"
                ? "bg-red-200 dark:bg-red-900 text-red-900 dark:text-red-100 line-through"
                : ""
            }
          >
            {part.text}
          </span>
        ))}
      </div>
    );
  };

  const renderUnifiedDiff = () => {
    if (!oldText && !newText) {
      return (
        <p className="text-sm text-muted-foreground">
          Enter text in both fields to see the difference.
        </p>
      );
    }
    const diff = diffLines(oldText, newText);
    const oldLines = diff
      .filter((line) => line.type !== "added")
      .map((line) => line.oldContent ?? line.newContent ?? "");
    const newLines = diff
      .filter((line) => line.type !== "removed")
      .map((line) => line.newContent ?? line.oldContent ?? "");

    let oldIdx = 0;
    let newIdx = 0;
    const oldChangedIdx: number[] = [];
    const newChangedIdx: number[] = [];
    for (const line of diff) {
      if (line.type !== "added") {
        oldIdx++;
        if (line.type === "removed" || line.type === "modified") {
          oldChangedIdx.push(oldIdx);
        }
      }
      if (line.type !== "removed") {
        newIdx++;
        if (line.type === "added" || line.type === "modified") {
          newChangedIdx.push(newIdx);
        }
      }
    }

    return (
      <div className="flex flex-col gap-4">
        <div className="diff-removed">
          <ToolField label={`Original (${oldLines.length} lines)`}>
            <CodeBlock
              code={oldLines.join("\n")}
              language="text"
              filename="original"
              showLineNumbers
              highlightLines={oldChangedIdx}
              maxHeight="max-h-80"
            />
          </ToolField>
        </div>
        <div className="diff-added">
          <ToolField label={`New (${newLines.length} lines)`}>
            <CodeBlock
              code={newLines.join("\n")}
              language="text"
              filename="new"
              showLineNumbers
              highlightLines={newChangedIdx}
              maxHeight="max-h-80"
            />
          </ToolField>
        </div>
        <p className="text-xs text-muted-foreground">
          {oldChangedIdx.length + newChangedIdx.length} changed line
          {oldChangedIdx.length + newChangedIdx.length === 1 ? "" : "s"}{" "}
          highlighted.
        </p>
      </div>
    );
  };

  return (
    <ToolContainer>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ToolField label="Original Text" htmlFor="diff-old">
          <Textarea
            id="diff-old"
            value={oldText}
            onChange={(e) => setOldText(e.target.value)}
            placeholder="Paste the original text..."
            className="min-h-32 font-mono text-sm"
            spellCheck={false}
          />
        </ToolField>
        <ToolField label="New Text" htmlFor="diff-new">
          <Textarea
            id="diff-new"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Paste the new text..."
            className="min-h-32 font-mono text-sm"
            spellCheck={false}
          />
        </ToolField>
      </div>

      <ToolField label="Diff Mode">
        <Select
          value={mode}
          onValueChange={(v) => setMode(v as "line" | "word" | "unified")}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="line">Line by line</SelectItem>
            <SelectItem value="word">Word by word</SelectItem>
            <SelectItem value="unified">Unified (highlighted code)</SelectItem>
          </SelectContent>
        </Select>
      </ToolField>

      <div>
        {mode === "line"
          ? renderLineDiff()
          : mode === "word"
          ? renderWordDiff()
          : renderUnifiedDiff()}
      </div>
    </ToolContainer>
  );
}