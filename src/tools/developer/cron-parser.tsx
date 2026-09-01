"use client";

import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";
import { ToolActions, ToolContainer, ToolError, ToolField } from "@/components/tool-forms";
import { Input } from "@/components/ui/input";

type CronResult = {
  valid: boolean;
  description: string;
  nextRuns: Date[];
  error?: string;
};

const FIELD_NAMES = ["second", "minute", "hour", "day of month", "month", "day of week"];
const FIELD_RANGES_6: Array<[number, number]> = [
  [0, 59], // seconds
  [0, 59], // minutes
  [0, 23], // hours
  [1, 31], // day of month
  [1, 12], // month
  [0, 6],  // day of week
];

function parseField(field: string, range: [number, number]): number[] {
  const min = range[0];
  const max = range[1];
  const values = new Set<number>();

  const parts = field.split(",");
  for (const part of parts) {
    let step = 1;
    let main = part;
    if (part.includes("/")) {
      const [m, s] = part.split("/");
      main = m;
      step = parseInt(s, 10);
      if (isNaN(step) || step < 1) throw new Error(`Invalid step in: ${part}`);
    }

    if (main === "*") {
      for (let i = min; i <= max; i += step) values.add(i);
    } else if (main.includes("-")) {
      const [startStr, endStr] = main.split("-");
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (isNaN(start) || isNaN(end) || start < min || end > max || start > end) {
        throw new Error(`Invalid range in: ${part}`);
      }
      for (let i = start; i <= end; i += step) values.add(i);
    } else {
      const num = parseInt(main, 10);
      if (isNaN(num) || num < min || num > max) {
        throw new Error(`Invalid value in: ${part}`);
      }
      values.add(num);
    }
  }
  return Array.from(values).sort((a, b) => a - b);
}

function describeField(value: string, fieldIndex: number): string {
  const name = FIELD_NAMES[fieldIndex];
  if (value === "*") return `every ${name}`;
  if (value.includes("/")) {
    const [base, step] = value.split("/");
    if (base === "*") return `every ${step} ${name}${parseInt(step, 10) > 1 ? "s" : ""}`;
  }
  if (value.includes(",")) {
    return `at ${name}s ${value}`;
  }
  if (value.includes("-")) {
    return `from ${value.replace("-", " to ")} ${name}`;
  }
  return `at ${name} ${value}`;
}

function buildDescription(fields: string[]): string {
  const parts = fields.map((f, i) => describeField(f, i));
  return parts.join(", ");
}

function matches(date: Date, fields: number[][], hasSeconds: boolean): boolean {
  const offset = hasSeconds ? 0 : -1;
  const secondField = hasSeconds ? fields[0] : null;
  return (
    (secondField === null || secondField.includes(date.getSeconds())) &&
    fields[offset + 1].includes(date.getMinutes()) &&
    fields[offset + 2].includes(date.getHours()) &&
    fields[offset + 3].includes(date.getDate()) &&
    fields[offset + 4].includes(date.getMonth() + 1) &&
    fields[offset + 5].includes(date.getDay())
  );
}

function getNextRuns(
  parsedFields: number[][],
  hasSeconds: boolean,
  count: number = 5,
): Date[] {
  const runs: Date[] = [];
  const now = new Date();
  const current = hasSeconds
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds() + 1, 0)
    : new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() + 1, 0, 0);

  let iterations = 0;
  // A year of seconds is too many; a year of minutes for 5-field.
  // Cap iterations so a non-matching expression can't hang the tab.
  const maxIterations = hasSeconds ? 366 * 24 * 60 * 6 : 366 * 24 * 60;
  while (runs.length < count && iterations < maxIterations) {
    if (matches(current, parsedFields, hasSeconds)) {
      runs.push(new Date(current));
    }
    if (hasSeconds) {
      current.setSeconds(current.getSeconds() + 1);
    } else {
      current.setMinutes(current.getMinutes() + 1);
    }
    iterations++;
  }
  return runs;
}

function parseCron(expr: string): CronResult {
  const trimmed = expr.trim().replace(/\s+/g, " ");
  const parts = trimmed.split(" ");

  if (parts.length !== 5 && parts.length !== 6) {
    return {
      valid: false,
      description: "",
      nextRuns: [],
      error: `Cron expression must have 5 or 6 fields, got ${parts.length}`,
    };
  }

  const hasSeconds = parts.length === 6;
  const fields = hasSeconds ? parts : [`0`, ...parts];
  try {
    const parsedFields = fields.map((f, i) => parseField(f, FIELD_RANGES_6[i]));
    return {
      valid: true,
      description: buildDescription(fields),
      nextRuns: getNextRuns(parsedFields, hasSeconds),
    };
  } catch (err) {
    return {
      valid: false,
      description: "",
      nextRuns: [],
      error: err instanceof Error ? err.message : "Invalid cron expression",
    };
  }
}

export function CronParser({}: ToolComponentProps) {
  const [input, setInput] = useState("0 9 * * 1-5");
  const [result, setResult] = useState<CronResult | null>(null);
  const [error, setError] = useState("");

  const handleParse = () => {
    setError("");
    if (!input.trim()) {
      setError("Please enter a cron expression");
      return;
    }
    const parsed = parseCron(input);
    setResult(parsed);
  };

  const handleClear = () => {
    setInput("");
    setResult(null);
    setError("");
  };

  return (
    <ToolContainer>
      <ToolField
        label="Cron Expression"
        htmlFor="cron-input"
        help="Format: [second] minute hour day-of-month month day-of-week — 5 fields (minutes) or 6 fields (with seconds)"
      >
        <Input
          id="cron-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. 0 9 * * 1-5 (weekdays at 9 AM)"
          className="font-mono"
        />
      </ToolField>

      {error && <ToolError message={error} />}

      <ToolActions
        onRun={handleParse}
        onClear={handleClear}
        runLabel="Parse"
        disabled={!input.trim()}
      />

      {result && (
        <div className="flex flex-col gap-4">
          {result.valid ? (
            <>
              <ToolField label="Description" htmlFor="cron-description">
                <p
                  id="cron-description"
                  className="rounded-md border bg-success/5 p-3 text-sm text-success"
                >
                  {result.description}
                </p>
              </ToolField>
              <ToolField label="Next 5 executions">
                <ul className="divide-y rounded-md border">
                  {result.nextRuns.map((run, i) => (
                    <li key={i} className="p-3 font-mono text-sm">
                      {run.toLocaleString()}
                    </li>
                  ))}
                </ul>
              </ToolField>
            </>
          ) : (
            <ToolError message={result.error ?? "Invalid cron expression"} />
          )}
        </div>
      )}

      <div className="border-t pt-4 text-xs text-muted-foreground">
        <p className="mb-1 font-medium">Examples:</p>
        <ul className="flex flex-col gap-1">
          <li><code>0 9 * * 1-5</code> — 9 AM on weekdays</li>
          <li><code>*/15 * * * *</code> — every 15 minutes</li>
          <li><code>0 0 1 * *</code> — first day of each month at midnight</li>
          <li><code>0 12 * * 0</code> — noon every Sunday</li>
          <li><code>30 */10 * * * *</code> — at second 30 of every 10th minute (6-field)</li>
        </ul>
      </div>
    </ToolContainer>
  );
}
