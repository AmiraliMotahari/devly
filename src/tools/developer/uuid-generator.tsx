"use client";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(uuids.join("\n"));
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy — clipboard unavailable");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <label htmlFor="uuid-count" className="text-sm font-medium">Count</label>
          <Input
            id="uuid-count"
            type="number"
            min={1}
            max={1000}
            value={count}
            onChange={(e) =>
              setCount(Math.min(1000, Math.max(1, Number(e.target.value))))
            }
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="uuid-uppercase" className="text-sm font-medium">Uppercase</label>
          <Switch
            id="uuid-uppercase"
            checked={uppercase}
            onCheckedChange={setUppercase}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="uuid-hyphens" className="text-sm font-medium">Hyphens</label>
          <Switch
            id="uuid-hyphens"
            checked={hyphens}
            onCheckedChange={setHyphens}
          />
        </div>
      </div>
      <Button onClick={generate}>
        <Play data-icon="inline-start" /> Generate UUIDs
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
                  <Copy className="size-4" /> Copy all
                </Button>
                <Button variant="ghost" size="sm" onClick={generate}>
                  <RefreshCw className="size-4" /> Regenerate
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
