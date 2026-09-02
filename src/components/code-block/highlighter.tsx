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
      engine={ENGINE}
      // theme={theme === "dark" ? "light-plus" : "light-plus"}
      theme={{
        light: "light-plus",
        dark: "dark-plus",
      }}
      defaultColor={"light-dark()"}
      showLanguage={false}
      showLineNumbers={showLineNumbers}
      highlightLineNumbers={highlightLines ? [...highlightLines] : undefined}
      preloadLanguages={preloadLanguages}
      tabindex={0}
      className="[&_pre]:rounded-none!"
    >
      {code}
    </ShikiHighlighter>
  );
}
