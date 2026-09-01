import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";

type CronResult = {
  valid: boolean;
  description: string;
  nextRuns: Date[];
  error?: string;
};

const FIELD_NAMES = ["minute", "hour", "day of month", "month", "day of week"];
const FIELD_RANGES: Array<[number, number]> = [
  [0, 59],
  [0, 23],
  [1, 31],
  [1, 12],
  [0, 6],
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

function matches(date: Date, fields: number[][]): boolean {
  return (
    fields[0].includes(date.getMinutes()) &&
    fields[1].includes(date.getHours()) &&
    fields[2].includes(date.getDate()) &&
    fields[3].includes(date.getMonth() + 1) &&
    fields[4].includes(date.getDay())
  );
}

function getNextRuns(parsedFields: number[][], count: number = 5): Date[] {
  const runs: Date[] = [];
  const now = new Date();
  const current = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() + 1, 0, 0);

  let iterations = 0;
  const maxIterations = 366 * 24 * 60;
  while (runs.length < count && iterations < maxIterations) {
    if (matches(current, parsedFields)) {
      runs.push(new Date(current));
    }
    current.setMinutes(current.getMinutes() + 1);
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

  const fields = parts.slice(0, 5);
  try {
    const parsedFields = fields.map((f, i) => parseField(f, FIELD_RANGES[i]));
    return {
      valid: true,
      description: buildDescription(fields),
      nextRuns: getNextRuns(parsedFields),
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

  return (
    <div className="tool-container space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Cron Expression</label>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. 0 9 * * 1-5 (weekdays at 9 AM)"
          className="w-full p-3 border rounded font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Format: minute hour day-of-month month day-of-week
        </p>
      </div>

      <button
        onClick={handleParse}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Parse
      </button>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {result && (
        <div className="space-y-4">
          {result.valid ? (
            <>
              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <p className="p-3 border rounded bg-green-50 dark:bg-green-950/30 text-sm">
                  {result.description}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Next 5 executions
                </label>
                <ul className="border rounded divide-y">
                  {result.nextRuns.map((run, i) => (
                    <li key={i} className="p-3 text-sm font-mono">
                      {run.toLocaleString()}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="p-3 border rounded bg-red-50 dark:bg-red-950/30 text-sm text-red-700 dark:text-red-300">
              <strong>Error:</strong> {result.error}
            </div>
          )}
        </div>
      )}

      <div className="border-t pt-4 text-xs text-muted-foreground">
        <p className="font-medium mb-1">Examples:</p>
        <ul className="space-y-1">
          <li><code>0 9 * * 1-5</code> — 9 AM on weekdays</li>
          <li><code>*/15 * * * *</code> — every 15 minutes</li>
          <li><code>0 0 1 * *</code> — first day of each month at midnight</li>
          <li><code>0 12 * * 0</code> — noon every Sunday</li>
        </ul>
      </div>
    </div>
  );
}
