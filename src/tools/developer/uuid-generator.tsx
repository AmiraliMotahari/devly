"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { ToolComponentProps } from "@/tools/tool-props";
import { Copy, Play, RefreshCw } from "lucide-react";
import { useState } from "react";

function uuidv4(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function UuidGenerator({ tool }: ToolComponentProps) {
  const countOption = tool.options?.find((o) => o.key === "count");
  const upperOption = tool.options?.find((o) => o.key === "uppercase");
  const hyphensOption = tool.options?.find((o) => o.key === "hyphens");

  const defaultCount = Number(countOption?.default ?? 5);
  const defaultUpper = Boolean(upperOption?.default ?? false);
  const defaultHyphens = Boolean(hyphensOption?.default ?? true);

  const [count, setCount] = useState(defaultCount);
  const [uppercase, setUppercase] = useState(defaultUpper);
  const [hyphens, setHyphens] = useState(defaultHyphens);
  const [uuids, setUuids] = useState<string[]>([]);

  const generate = () => {
    const list: string[] = [];
    for (let i = 0; i < count; i++) {
      let id = uuidv4();
      if (!hyphens) id = id.replace(/-/g, "");
      if (uppercase) id = id.toUpperCase();
      list.push(id);
    }
    setUuids(list);
  };

  const copyAll = () => {
    navigator.clipboard.writeText(uuids.join("\n"));
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">Count</label>
          <input
            type="number"
            min={1}
            max={1000}
            value={count}
            onChange={(e) =>
              setCount(Math.min(1000, Math.max(1, Number(e.target.value))))
            }
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Uppercase</label>
          <button
            role="switch"
            aria-checked={uppercase}
            onClick={() => setUppercase(!uppercase)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${uppercase ? "bg-primary" : "bg-muted"}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${uppercase ? "translate-x-6" : "translate-x-1"}`}
            />
          </button>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Hyphens</label>
          <button
            role="switch"
            aria-checked={hyphens}
            onClick={() => setHyphens(!hyphens)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${hyphens ? "bg-primary" : "bg-muted"}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${hyphens ? "translate-x-6" : "translate-x-1"}`}
            />
          </button>
        </div>
      </div>
      <Button onClick={generate}>
        <Play className="mr-2 h-4 w-4" /> Generate UUIDs
      </Button>
      {uuids.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">
                {uuids.length} UUIDs
              </label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={copyAll}>
                  <Copy className="h-4 w-4" /> Copy all
                </Button>
                <Button variant="ghost" size="sm" onClick={generate}>
                  <RefreshCw className="h-4 w-4" /> Regenerate
                </Button>
              </div>
            </div>
            <Textarea
              readOnly
              value={uuids.join("\n")}
              className="min-h-50 font-mono text-sm"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
