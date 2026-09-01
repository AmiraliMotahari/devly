"use client";

import { Button } from "@/components/ui/button";
import { CopyToClipboard } from "@/components/copy-to-clipboard";
import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";
import { Download, Plus, Trash2 } from "lucide-react";

interface Rule {
  userAgent: string;
  disallow: string[];
  allow: string[];
}

export function RobotsGenerator({}: ToolComponentProps) {
  const [siteUrl, setSiteUrl] = useState("");
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [rules, setRules] = useState<Rule[]>([
    { userAgent: "*", disallow: ["/"], allow: [] },
  ]);
  const [output, setOutput] = useState("");

  const generate = () => {
    const lines: string[] = [];

    if (siteUrl) {
      lines.push(`# Site: ${siteUrl}`);
      lines.push("");
    }

    for (const rule of rules) {
      if (rule.userAgent) {
        lines.push(`User-agent: ${rule.userAgent}`);
      }
      for (const path of rule.disallow) {
        lines.push(`Disallow: ${path}`);
      }
      for (const path of rule.allow) {
        lines.push(`Allow: ${path}`);
      }
      lines.push("");
    }

    if (sitemapUrl) {
      lines.push(`Sitemap: ${sitemapUrl}`);
    } else if (siteUrl) {
      lines.push(`Sitemap: ${siteUrl}/sitemap.xml`);
    }

    setOutput(lines.join("\n"));
  };

  const updateRule = (index: number, field: keyof Rule, value: string | string[]) => {
    setRules((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    );
  };

  const addDisallow = (index: number) => {
    const rule = rules[index];
    updateRule(index, "disallow", [...rule.disallow, "/"]);
  };

  const removeDisallow = (ruleIndex: number, pathIndex: number) => {
    const rule = rules[ruleIndex];
    updateRule(ruleIndex, "disallow", rule.disallow.filter((_, i) => i !== pathIndex));
  };

  const addRule = () => {
    setRules((prev) => [
      ...prev,
      { userAgent: "Googlebot", disallow: [], allow: [] },
    ]);
  };

  const removeRule = (index: number) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
  };

  const download = () => {
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "robots.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Site URL (optional)</label>
          <input
            type="url"
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Sitemap URL</label>
          <input
            type="url"
            value={sitemapUrl}
            onChange={(e) => setSitemapUrl(e.target.value)}
            placeholder="https://example.com/sitemap.xml"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Crawl Rules</label>
          <Button variant="outline" size="sm" onClick={addRule}>
            <Plus data-icon="inline-start" />
            Add Rule
          </Button>
        </div>

        {rules.map((rule, idx) => (
          <div key={idx} className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Rule {idx + 1}</span>
              {rules.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRule(idx)}
                >
                  <Trash2 className="size-4"/>
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-muted-foreground">User-agent</label>
              <input
                type="text"
                value={rule.userAgent}
                onChange={(e) => updateRule(idx, "userAgent", e.target.value)}
                placeholder="* or Googlebot, Bingbot, etc."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Disallow</label>
                <Button variant="ghost" size="sm" onClick={() => addDisallow(idx)}>
                  <Plus className="h-3 w-3 mr-1"/>
                  Add path
                </Button>
              </div>
              {rule.disallow.map((path, pathIdx) => (
                <div key={pathIdx} className="flex gap-2">
                  <input
                    type="text"
                    value={path}
                    onChange={(e) => {
                      const updated = [...rule.disallow];
                      updated[pathIdx] = e.target.value;
                      updateRule(idx, "disallow", updated);
                    }}
                    placeholder="/admin/, /private/, etc."
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeDisallow(idx, pathIdx)}
                  >
                    <Trash2 className="size-4"/>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Button onClick={generate} className="w-full">Generate robots.txt</Button>

      {output && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Generated robots.txt</label>
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
