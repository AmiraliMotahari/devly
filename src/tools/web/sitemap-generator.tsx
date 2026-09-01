"use client";

import { Button } from "@/components/ui/button";
import { CopyToClipboard } from "@/components/copy-to-clipboard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";
import { Download, Plus, Trash2 } from "lucide-react";

interface SitemapEntry {
  url: string;
  lastmod?: string;
  priority?: string;
  changefreq?: string;
}

export function SitemapGenerator({}: ToolComponentProps) {
  const [baseUrl, setBaseUrl] = useState("");
  const [entries, setEntries] = useState<SitemapEntry[]>([
    { url: "", lastmod: "", priority: "0.5", changefreq: "weekly" },
  ]);
  const [output, setOutput] = useState("");

  const generate = () => {
    const today = new Date().toISOString().split("T")[0];
    const base = baseUrl.replace(/\/$/, "");

    const urls = entries
      .filter((e) => e.url.trim())
      .map((e) => {
        const loc = `${base}${e.url.startsWith("/") ? "" : "/"}${e.url}`;
        const lastmod = e.lastmod || today;
        const priority = e.priority || "0.5";
        const changefreq = e.changefreq || "weekly";

        return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    setOutput(xml);
  };

  const addEntry = () => {
    setEntries((prev) => [
      ...prev,
      { url: "", lastmod: "", priority: "0.5", changefreq: "weekly" },
    ]);
  };

  const removeEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, field: keyof SitemapEntry, value: string) => {
    setEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)),
    );
  };

  const download = () => {
    const blob = new Blob([output], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sitemap.xml";
    a.click();
    URL.revokeObjectURL(url);
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Base URL</label>
        <input
          type="url"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://example.com"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">URLs</label>
          <Button variant="outline" size="sm" onClick={addEntry}>
            <Plus data-icon="inline-start" />
            Add URL
          </Button>
        </div>

        <div className=" max-h-80 overflow-y-auto">
          {entries.map((entry, idx) => (
            <div key={idx} className="border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                {entries.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeEntry(idx)}>
                    <Trash2 className="size-4"/>
                  </Button>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs text-muted-foreground">Path (e.g. /about, /blog/post-1)</label>
                <input
                  type="text"
                  value={entry.url}
                  onChange={(e) => updateEntry(idx, "url", e.target.value)}
                  placeholder="/"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                />
              </div>

              <div className="grid gap-2 grid-cols-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Last Modified</label>
                  <input
                    type="date"
                    value={entry.lastmod || today}
                    onChange={(e) => updateEntry(idx, "lastmod", e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor={`sm-priority-${idx}`} className="text-xs text-muted-foreground">Priority</label>
                  <Select
                    value={entry.priority}
                    onValueChange={(v) => updateEntry(idx, "priority", v)}
                  >
                    <SelectTrigger id={`sm-priority-${idx}`} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1.0">1.0 (Highest)</SelectItem>
                      <SelectItem value="0.9">0.9</SelectItem>
                      <SelectItem value="0.8">0.8</SelectItem>
                      <SelectItem value="0.7">0.7</SelectItem>
                      <SelectItem value="0.6">0.6</SelectItem>
                      <SelectItem value="0.5">0.5 (Normal)</SelectItem>
                      <SelectItem value="0.4">0.4</SelectItem>
                      <SelectItem value="0.3">0.3</SelectItem>
                      <SelectItem value="0.2">0.2</SelectItem>
                      <SelectItem value="0.1">0.1 (Lowest)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor={`sm-freq-${idx}`} className="text-xs text-muted-foreground">Change Freq</label>
                  <Select
                    value={entry.changefreq}
                    onValueChange={(v) => updateEntry(idx, "changefreq", v)}
                  >
                    <SelectTrigger id={`sm-freq-${idx}`} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="always">always</SelectItem>
                      <SelectItem value="hourly">hourly</SelectItem>
                      <SelectItem value="daily">daily</SelectItem>
                      <SelectItem value="weekly">weekly</SelectItem>
                      <SelectItem value="monthly">monthly</SelectItem>
                      <SelectItem value="yearly">yearly</SelectItem>
                      <SelectItem value="never">never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button onClick={generate} className="w-full">Generate Sitemap</Button>

      {output && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Generated sitemap.xml</label>
            <div className="flex gap-2">
              <CopyToClipboard value={output} variant="outline" size="sm" showLabel />
              <Button variant="outline" size="sm" onClick={download}>
                <Download data-icon="inline-start" />
                Download
              </Button>
            </div>
          </div>
          <pre className="w-full p-4 border rounded-lg bg-muted overflow-auto text-xs font-mono max-h-80">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}
