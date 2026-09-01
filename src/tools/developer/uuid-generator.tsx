"use client";

import { useState } from "react";
import { v1, v3, v4, v5, v6, v7 } from "uuid";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyToClipboard } from "@/components/copy-to-clipboard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ToolComponentProps } from "@/tools/tool-props";
import { Play, RefreshCw } from "lucide-react";

type Version = "v1" | "v3" | "v4" | "v5" | "v6" | "v7";

const VERSION_INFO: Record<Version, { label: string; hint: string }> = {
  v1: {
    label: "v1 — Time-based",
    hint: "Gregorian timestamp + clock sequence + node. Unique even at high generation rates.",
  },
  v3: {
    label: "v3 — Namespaced MD5 (legacy)",
    hint: "Deterministic like v5 but with MD5 — kept for compatibility with older systems.",
  },
  v4: { label: "v4 — Random", hint: "Fully random, the universal default." },
  v5: {
    label: "v5 — Namespaced SHA-1",
    hint: "Deterministic: the same name + namespace always yields the same UUID.",
  },
  v6: {
    label: "v6 — Reordered time (v1 variant)",
    hint: "Like v1 but with a sortable timestamp layout — better as database keys.",
  },
  v7: {
    label: "v7 — Timestamp-sortable",
    hint: "Millisecond Unix timestamp prefix — sortable, great for database keys.",
  },
};

// Namespaced versions (v3/v5) share the namespace + name inputs
const NAMESPACED: readonly Version[] = ["v3", "v5"];

const NAMESPACE_PRESETS = [
  { label: "URL", value: v5.URL },
  { label: "DNS", value: v5.DNS },
  { label: "OID", value: "6ba7b812-9dad-11d1-80b4-00c04fd430c8" },
  { label: "X500", value: "6ba7b814-9dad-11d1-80b4-00c04fd430c8" },
];

export function UuidGenerator({ tool }: ToolComponentProps) {
  const countOption = tool.options?.find((o) => o.key === "count");
  const upperOption = tool.options?.find((o) => o.key === "uppercase");
  const hyphensOption = tool.options?.find((o) => o.key === "hyphens");

  const defaultCount = Number(countOption?.default ?? 5);
  const defaultUpper = Boolean(upperOption?.default ?? false);
  const defaultHyphens = Boolean(hyphensOption?.default ?? true);

  const [version, setVersion] = useState<Version>("v4");
  const [count, setCount] = useState(defaultCount);
  const [uppercase, setUppercase] = useState(defaultUpper);
  const [hyphens, setHyphens] = useState(defaultHyphens);

  const [namespace, setNamespace] = useState(v5.URL);
  const [name, setName] = useState("https://example.com");

  const [uuids, setUuids] = useState<string[]>([]);

  const generateOne = (): string => {
    switch (version) {
      case "v1":
        return v1();
      case "v3":
        return v3(name, namespace);
      case "v4":
        return v4();
      case "v5":
        return v5(name, namespace);
      case "v6":
        return v6();
      case "v7":
        return v7();
    }
  };

  const generate = () => {
    const next: string[] = [];
    for (let i = 0; i < count; i++) {
      let id = generateOne();
      if (!hyphens) id = id.replace(/-/g, "");
      if (uppercase) id = id.toUpperCase();
      next.push(id);
    }
    // v3/v5 are deterministic — generating "count" of the same name+namespace
    // yields identical UUIDs; that's expected, show it honestly.
    setUuids(Array.from(new Set(next)));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="uuid-version">UUID version</Label>
          <Select
            value={version}
            onValueChange={(v) => setVersion(v as Version)}
          >
            <SelectTrigger id="uuid-version" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(VERSION_INFO).map(([v, info]) => (
                <SelectItem key={v} value={v}>
                  {info.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {VERSION_INFO[version].hint}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="uuid-count">Count</Label>
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
      </div>

      {NAMESPACED.includes(version) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="uuid-namespace">Namespace</Label>
            <Select value={namespace} onValueChange={setNamespace}>
              <SelectTrigger id="uuid-namespace" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NAMESPACE_PRESETS.map((ns) => (
                  <SelectItem key={ns.value} value={ns.value}>
                    {ns.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="font-mono text-xs text-muted-foreground">{namespace}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="uuid-name">Name</Label>
            <Input
              id="uuid-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. https://example.com"
              className="font-mono"
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-6">
        <div className="flex items-center gap-2">
          <Switch
            id="uuid-uppercase"
            checked={uppercase}
            onCheckedChange={setUppercase}
          />
          <Label htmlFor="uuid-uppercase" className="font-normal">
            Uppercase
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="uuid-hyphens"
            checked={hyphens}
            onCheckedChange={setHyphens}
          />
          <Label htmlFor="uuid-hyphens" className="font-normal">
            Hyphens
          </Label>
        </div>
      </div>

      <Button onClick={generate}>
        <Play data-icon="inline-start" /> Generate UUIDs
      </Button>

      {uuids.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <Label htmlFor="uuid-output">
                {uuids.length} UUID{uuids.length === 1 ? "" : "s"} ({version})
              </Label>
              <div className="flex gap-2">
                <CopyToClipboard
                  value={uuids.join("\n")}
                  variant="ghost"
                  size="sm"
                  showLabel
                  label="Copy all"
                />
                <Button variant="ghost" size="sm" onClick={generate}>
                  <RefreshCw data-icon="inline-start" />
                  Regenerate
                </Button>
              </div>
            </div>
            <Textarea
              id="uuid-output"
              readOnly
              value={uuids.join("\n")}
              className="min-h-40 font-mono text-sm"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
