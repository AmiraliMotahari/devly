"use client";

import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";
import {
  ToolActions,
  ToolContainer,
  ToolField,
  ToolRow,
} from "@/components/tool-forms";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface Diff {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  totalWeeks: number;
  weekdays: number;
  hours: number;
  minutes: number;
}

function diffDays(a: Date, b: Date): Diff {
  const start = a < b ? a : b;
  const end = a < b ? b : a;

  // Calendar-aware Y/M/D diff
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();
  if (days < 0) {
    months--;
    const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
    days += prevMonth;
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  const totalDays = Math.round(
    (end.getTime() - start.getTime()) / 86_400_000,
  );

  // Weekday count (Mon-Fri) between the two dates
  let weekdays = 0;
  const cursor = new Date(start);
  while (cursor < end) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) weekdays++;
    cursor.setDate(cursor.getDate() + 1);
  }

  const totalMs = end.getTime() - start.getTime();
  return {
    years,
    months,
    days,
    totalDays,
    totalWeeks: Math.floor(totalDays / 7),
    weekdays,
    hours: Math.round(totalMs / 3_600_000),
    minutes: Math.round(totalMs / 60_000),
  };
}

export function DateDifference({}: ToolComponentProps) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [diff, setDiff] = useState<Diff | null>(null);
  const [error, setError] = useState("");

  const handleCalculate = () => {
    setError("");
    setDiff(null);

    if (!start || !end) {
      setError("Please select both dates");
      return;
    }
    const a = new Date(start);
    const b = new Date(end);
    if (isNaN(a.getTime()) || isNaN(b.getTime())) {
      setError("Invalid date");
      return;
    }
    setDiff(diffDays(a, b));
  };

  const fmt = (n: number, unit: string) =>
    `${n.toLocaleString()} ${unit}${n === 1 ? "" : "s"}`;

  return (
    <ToolContainer>
      <ToolRow>
        <div className="flex flex-col gap-2">
          <label htmlFor="dd-start" className="text-sm font-medium">
            Start date
          </label>
          <Input
            id="dd-start"
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="dd-end" className="text-sm font-medium">
            End date
          </label>
          <Input
            id="dd-end"
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
      </ToolRow>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <ToolActions
        onRun={handleCalculate}
        onClear={() => {
          setStart("");
          setEnd("");
          setDiff(null);
          setError("");
        }}
        runLabel="Calculate difference"
        disabled={!start || !end}
      />

      {diff && (
        <ToolField label="Difference">
          <Card>
            <CardContent className="flex flex-col gap-3 p-4">
              <p className="text-2xl font-bold">
                {fmt(diff.years, "year")}, {fmt(diff.months, "month")},{" "}
                {fmt(diff.days, "day")}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                <p className="text-muted-foreground">
                  Total: <span className="font-medium text-foreground">{fmt(diff.totalDays, "day")}</span>
                </p>
                <p className="text-muted-foreground">
                  Weeks: <span className="font-medium text-foreground">{diff.totalWeeks.toLocaleString()}</span>
                </p>
                <p className="text-muted-foreground">
                  Weekdays: <span className="font-medium text-foreground">{diff.weekdays.toLocaleString()}</span>
                </p>
                <p className="text-muted-foreground">
                  Hours: <span className="font-medium text-foreground">{diff.hours.toLocaleString()}</span>
                </p>
                <p className="text-muted-foreground">
                  Minutes: <span className="font-medium text-foreground">{diff.minutes.toLocaleString()}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </ToolField>
      )}
    </ToolContainer>
  );
}
