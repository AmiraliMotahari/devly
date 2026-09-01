"use client";

import { useState } from "react";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyToClipboard } from "@/components/copy-to-clipboard";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ToolComponentProps } from "@/tools/tool-props";

const now = Date.now();

export function TimestampConverter({ tool }: ToolComponentProps) {
  void tool;
  const [mode, setMode] = useState<"ts-to-date" | "date-to-ts">("ts-to-date");
  const [timestamp, setTimestamp] = useState(String(Math.floor(now / 1000)));
  const [dateInput, setDateInput] = useState("");

  const ts = Number(timestamp);
  const tsValid = !isNaN(ts) && timestamp.trim() !== "";
  const date = tsValid ? new Date(ts * 1000) : null;

  let parsedTs: number | null = null;
  let parsedDate: Date | null = null;
  if (mode === "date-to-ts" && dateInput) {
    const d = new Date(dateInput);
    if (!isNaN(d.getTime())) {
      parsedDate = d;
      parsedTs = Math.floor(d.getTime() / 1000);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Button
          variant={mode === "ts-to-date" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("ts-to-date")}
        >
          <ArrowRight data-icon="inline-start" /> Timestamp to Date
        </Button>
        <Button
          variant={mode === "date-to-ts" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("date-to-ts")}
        >
          <ArrowLeft data-icon="inline-start" /> Date to Timestamp
        </Button>
      </div>

      {mode === "ts-to-date" ? (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ts-input">Unix timestamp (seconds)</Label>
            <Input
              id="ts-input"
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
              placeholder="1692489600"
            />
          </div>

          {date && tsValid && (
            <div className="flex flex-col gap-3">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">UTC</p>
                  <p className="font-mono text-sm">{date.toUTCString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Local time</p>
                  <p className="font-mono text-sm">{date.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">ISO 8601</p>
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-sm">{date.toISOString()}</p>
                    <CopyToClipboard value={date.toISOString()} variant="ghost" size="sm" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ts-date">Date and time</Label>
            <Input
              id="ts-date"
              type="datetime-local"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              step={1}
            />
          </div>

          {parsedDate && parsedTs !== null && (
            <div className="flex flex-col gap-3">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">
                    Unix timestamp (seconds)
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-lg font-bold">{parsedTs}</p>
                    <CopyToClipboard value={String(parsedTs)} variant="ghost" size="sm" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Milliseconds</p>
                  <p className="font-mono text-sm">{parsedTs * 1000}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">UTC</p>
                  <p className="font-mono text-sm">
                    {parsedDate.toUTCString()}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Current timestamp</p>
              <p className="font-mono text-sm">{Math.floor(now / 1000)}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const n = Math.floor(now / 1000);
                setTimestamp(String(n));
                setMode("ts-to-date");
              }}
            >
              Use now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
