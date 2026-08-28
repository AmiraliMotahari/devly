import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";

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
  const [mode, setMode] = useState<"line" | "word">("line");
  const [error, setError] = useState("");

  const renderLineDiff = () => {
    if (!oldText && !newText) {
      setError("Please enter both old and new text");
      return null;
    }
    setError("");
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
                ? "bg-yellow-50 dark:bg-yellow-950/30"
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
      setError("Please enter both old and new text");
      return null;
    }
    setError("");
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

  return (
    <div className="tool-container space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Original Text</label>
          <textarea
            value={oldText}
            onChange={(e) => setOldText(e.target.value)}
            placeholder="Paste the original text..."
            className="w-full h-32 p-3 border rounded font-mono text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">New Text</label>
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Paste the new text..."
            className="w-full h-32 p-3 border rounded font-mono text-sm"
          />
        </div>
      </div>

      <div className="flex items-end gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Diff Mode</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as "line" | "word")}
            className="p-2 border rounded"
          >
            <option value="line">Line by line</option>
            <option value="word">Word by word</option>
          </select>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="mt-4">
        {mode === "line" ? renderLineDiff() : renderWordDiff()}
      </div>
    </div>
  );
}
