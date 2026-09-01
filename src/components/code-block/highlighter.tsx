"use client";

import {
  createJavaScriptRegexEngine,
  ShikiHighlighter,
  type PreloadLanguage,
} from "react-shiki/web";

import { resolveLanguage } from "./language";

const ENGINE = createJavaScriptRegexEngine({ forgiving: true });

const LAZY_GRAMMARS: Record<string, PreloadLanguage[]> = {
  bash: [() => import("@shikijs/langs/bash")],
  python: [() => import("@shikijs/langs/python")],
  java: [() => import("@shikijs/langs/java")],
  c: [() => import("@shikijs/langs/c")],
  cpp: [() => import("@shikijs/langs/cpp")],
  csharp: [() => import("@shikijs/langs/csharp")],
  go: [() => import("@shikijs/langs/go")],
  rust: [() => import("@shikijs/langs/rust")],
  sql: [() => import("@shikijs/langs/sql")],
  toml: [() => import("@shikijs/langs/toml")],
  xml: [() => import("@shikijs/langs/xml")],
  dockerfile: [() => import("@shikijs/langs/dockerfile")],
};

type ShikiCodeProps = {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  highlightLines?: readonly number[];
};

export function ShikiCode({
  code,
  language,
  showLineNumbers = false,
  highlightLines,
}: ShikiCodeProps) {
  const resolvedLanguage = resolveLanguage(language);
  const preloadLanguages =
    resolvedLanguage in LAZY_GRAMMARS ? LAZY_GRAMMARS[resolvedLanguage] : [];

  return (
    <ShikiHighlighter
      language={resolvedLanguage}
      theme={{ light: "light-plus", dark: "dark-plus" }}
      engine={ENGINE}
      defaultColor={false}
      addDefaultStyles={false}
      showLanguage={false}
      showLineNumbers={showLineNumbers}
      highlightLineNumbers={
        highlightLines ? [...highlightLines] : undefined
      }
      preloadLanguages={preloadLanguages}
      tabindex={0}
      className="shiki-code"
      style={{
        "--rs-line-numbers-foreground": "var(--muted-foreground)",
        "--rs-line-numbers-opacity": "0.55",
        "--rs-line-numbers-width": "3ch",
      } as React.CSSProperties}
    >
      {code}
    </ShikiHighlighter>
  );
}
