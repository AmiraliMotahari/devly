"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";
import { Copy, Download } from "lucide-react";

export function MetaTagGenerator({}: ToolComponentProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [author, setAuthor] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [twitterCard, setTwitterCard] = useState<"summary" | "summary_large_image">("summary_large_image");
  const [themeColor, setThemeColor] = useState("#000000");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);

  const generate = () => {
    const safeTitle = title || "My Website";
    const safeDesc = description || "";
    const safeAuthor = author || "";
    const safeUrl = url || "https://example.com";
    const safeOgImg = ogImage || "";
    const safeTheme = themeColor || "#000000";

    const html = `<title>${safeTitle}</title>
<meta name="description" content="${safeDesc}">${safeAuthor ? `\n<meta name="author" content="${safeAuthor}">` : ""}
<meta name="robots" content="index, follow">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="${safeTheme}">

<!-- Open Graph / Facebook -->
<meta property="og:type" content="website">
<meta property="og:url" content="${safeUrl}">
<meta property="og:title" content="${safeTitle}">
<meta property="og:description" content="${safeDesc}">${safeOgImg ? `\n<meta property="og:image" content="${safeOgImg}">` : ""}

<!-- Twitter -->
<meta name="twitter:card" content="${twitterCard}">${safeOgImg ? `\n<meta name="twitter:image" content="${safeOgImg}">` : ""}
<meta name="twitter:title" content="${safeTitle}">
<meta name="twitter:description" content="${safeDesc}">

<!-- Canonical URL -->
<link rel="canonical" href="${safeUrl}">`;

    setOutput(html);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    const blob = new Blob([output], { type: "text/html" });
    const url2 = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url2;
    a.download = "meta-tags.html";
    a.click();
    URL.revokeObjectURL(url2);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Page URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Page Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My Awesome Page"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A brief description of your page"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Author</label>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="John Doe (optional)"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">OG Image URL</label>
          <input
            type="url"
            value={ogImage}
            onChange={(e) => setOgImage(e.target.value)}
            placeholder="https://example.com/og-image.png (optional)"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Theme Color</label>
          <div className="flex gap-2">
            <input
              type="color"
              value={themeColor}
              onChange={(e) => setThemeColor(e.target.value)}
              className="h-9 w-9 rounded border cursor-pointer"
            />
            <input
              type="text"
              value={themeColor}
              onChange={(e) => setThemeColor(e.target.value)}
              placeholder="#000000"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="twitter-card" className="text-sm font-medium">Twitter Card Type</label>
        <Select
          value={twitterCard}
          onValueChange={(v) => setTwitterCard(v as "summary" | "summary_large_image")}
        >
          <SelectTrigger id="twitter-card" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="summary">Summary (small image)</SelectItem>
            <SelectItem value="summary_large_image">Summary Large Image (recommended)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button onClick={generate} className="w-full">Generate Meta Tags</Button>

      {output && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Generated Meta Tags</label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyToClipboard}>
                <Copy data-icon="inline-start" />
                {copied ? "Copied!" : "Copy"}
              </Button>
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
