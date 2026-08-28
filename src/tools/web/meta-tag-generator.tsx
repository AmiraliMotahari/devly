"use client";

import { Button } from "@/components/ui/button";
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
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Page URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Page Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My Awesome Page"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A brief description of your page"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Author</label>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="John Doe (optional)"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">OG Image URL</label>
          <input
            type="url"
            value={ogImage}
            onChange={(e) => setOgImage(e.target.value)}
            placeholder="https://example.com/og-image.png (optional)"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
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

      <div className="space-y-2">
        <label className="text-sm font-medium">Twitter Card Type</label>
        <select
          value={twitterCard}
          onChange={(e) => setTwitterCard(e.target.value as "summary" | "summary_large_image")}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="summary">Summary (small image)</option>
          <option value="summary_large_image">Summary Large Image (recommended)</option>
        </select>
      </div>

      <Button onClick={generate} className="w-full">Generate Meta Tags</Button>

      {output && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Generated Meta Tags</label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyToClipboard}>
                <Copy className="h-4 w-4 mr-1" />
                {copied ? "Copied!" : "Copy"}
              </Button>
              <Button variant="outline" size="sm" onClick={download}>
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
          </div>
          <pre className="w-full p-4 border rounded-lg bg-gray-50 dark:bg-gray-900 overflow-auto text-xs font-mono max-h-80">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}
