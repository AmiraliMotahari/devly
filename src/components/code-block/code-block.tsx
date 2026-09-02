"use client";

import { ListOrdered } from "lucide-react";
import { useState } from "react";

import { CopyToClipboard } from "@/components/copy-to-clipboard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { getLanguageLabel, resolveLanguage } from "./language";
import { ShikiCode } from "./highlighter";
import type { CodeBlockProps } from "./types";

export function CodeBlock({
  code,
  language = "text",
  filename,
  showLineNumbers: initialShowLineNumbers = false,
  showCopyButton = true,
  highlightLines = [],
  maxHeight = "max-h-96",
  className,
}: CodeBlockProps) {
  const [showLineNumbers, setShowLineNumbers] = useState(
    initialShowLineNumbers,
  );

  const resolvedLanguage = resolveLanguage(language);
  const title =
    filename ??
    (resolvedLanguage === "text"
      ? undefined
      : getLanguageLabel(resolvedLanguage));
  const lineCount = code === "" ? 0 : code.split("\n").length;

  return (
    <section
      data-slot="code-block"
      aria-label={title ? `Code: ${title}` : "Code block"}
      className={cn(
        "overflow-hidden rounded-lg border bg-background text-foreground",
        className,
      )}
    >
      <header className="flex min-h-10 items-center justify-between gap-2 border-b bg-muted/50 px-3 py-1.5">
        <div className="min-w-0">
          {title ? (
            <span className="block truncate font-mono text-xs text-muted-foreground">
              {title}
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label={
              showLineNumbers ? "Hide line numbers" : "Show line numbers"
            }
            aria-pressed={showLineNumbers}
            title={showLineNumbers ? "Hide line numbers" : "Show line numbers"}
            onClick={() => setShowLineNumbers((value) => !value)}
          >
            <ListOrdered className="size-3.5" aria-hidden="true" />
          </Button>

          {showCopyButton ? (
            <CopyToClipboard
              value={code}
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Copy code to clipboard"
            />
          ) : null}
        </div>
      </header>

      <div className={cn("overflow-x-auto overflow-y-auto", maxHeight)}>
        <ShikiCode
          code={code}
          language={resolvedLanguage}
          showLineNumbers={showLineNumbers}
          highlightLines={highlightLines?.length ? highlightLines : undefined}
        />
      </div>

      <span className="sr-only">
        {lineCount} {lineCount === 1 ? "line" : "lines"}.
        {highlightLines.length > 0
          ? ` ${highlightLines.length} highlighted.`
          : ""}
      </span>
    </section>
  );
}
