"use client";

import { useState } from "react";
import { Copy, Check, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ToolComponentProps } from "@/tools/tool-props";

const now = Date.now();

export function TimestampConverter({ tool }: ToolComponentProps) {
  void tool;
  const [mode, setMode] = useState<"ts-to-date" | "date-to-ts">("ts-to-date");
  const [timestamp, setTimestamp] = useState(String(Math.floor(now / 1000)));
  const [dateInput, setDateInput] = useState("");
  const [copied, setCopied] = useState(false);

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

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={mode === "ts-to-date" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("ts-to-date")}
        >
          <ArrowRight className="mr-2 h-4 w-4" /> Timestamp to Date
        </Button>
        <Button
          variant={mode === "date-to-ts" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("date-to-ts")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Date to Timestamp
        </Button>
      </div>

      {mode === "ts-to-date" ? (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Unix timestamp (seconds)
            </label>
            <Input
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
              placeholder="1692489600"
            />
          </div>

          {date && tsValid && (
            <div className="space-y-3">
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copy(date.toISOString())}
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium">Date and time</label>
            <Input
              type="datetime-local"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              step={1}
            />
          </div>

          {parsedDate && parsedTs !== null && (
            <div className="space-y-3">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">
                    Unix timestamp (seconds)
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-lg font-bold">{parsedTs}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copy(String(parsedTs))}
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
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
