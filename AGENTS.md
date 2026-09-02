# devly — AGENTS.md

Generated from verified repo sources (README, package.json, next.config.ts, tool definitions, src layout). Keep this file in sync with the codebase.

## Project Overview

- **Framework**: Next.js 16.3.1 with `reactCompiler: true`, `cacheComponents: true`, `partialPrefetching: true`, `experimental: { typedEnv: true, useOffline: true }` (next.config.ts)
- **Runtime**: React 19.2.8, TypeScript 5.x
- **Styling**: Tailwind CSS + shadcn UI (Radix Nova), aliases configured in components.json
- **Icons**: Lucide React
- **Purpose**: A browser-first file/media/dev/toolkit — most tools run entirely in the client (no uploads, no server). Privacy is a core guarantee.

## Development Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Start Next.js dev server (`next dev`) |
| `pnpm build` | Next.js production build (`next build`) |
| `pnpm start` | Run production build (`next start`) |
| `pnpm lint` | Run ESLint (`eslint .`) |
| `pnpm test` | Vitest unit + component tests |
| `pnpm test:e2e` | Playwright E2E (prod build; Chromium + @critical webkit/firefox) |

> **Note**: This repo uses **pnpm v10.15.1** (package.json). Always use `pnpm`; do not switch to npm/yarn.

## Tool System — How to Add/Modify a Tool

The app is driven by a catalog of *tool definitions* that auto-generate pages, routes, search, and sitemaps.

1. **Add definition** in `src/tools/definitions.ts` — create a `ToolDefinition` entry with:
   - `id`, `slug`, `name`, `description`, `category`
   - `inputKind` (`"file" | "text" | "none"`)
   - `outputKind` (`"file" | "text" | "image" | "none"`)
   - `processingMode` (`"client"` for all tools in this repo)
   - `supportsBatch`, `requiresAuthentication`, `acceptFileTypes`, `maxFileSizeMB`, `maxFiles`
   - `options[]` (each with `key`, `label`, `type`, `default`, `options?`)
   - `keywords`, `relatedToolSlugs`, `faq`, `howItWorks`
   - `available: true`

2. **Create the UI component** at `src/tools/<category>/<slug>.tsx` with `"use client"` at the top, exporting a **named** function `<ToolName>Tool` (e.g., `CsvToJsonTool`). It must accept `ToolComponentProps` (`{ tool: ToolDefinition }`).

3. **Register the component** in `src/components/tool-loader.tsx` — add an entry to `TOOL_COMPONENTS` Record mapping `slug` → `dynamic(import("@/tools/<category>/<slug>").then(m => ({ default: m.<Tool> })))`.

4. **Route & metadata auto-generated**: The page at `src/app/tools/[slug]/page.tsx` calls `generateStaticParams()` and `generateMetadata()` from `toolDefinitions`, so new tools appear automatically at `/tools/<slug>`.

5. **Search** uses `src/tools/search.ts` — it indexes `toolDefinitions`. No separate index needed.

6. **Data converter specifics**: The `data` category converters share parsing/serialization helpers in `src/tools/data/lib.ts` (`csvToArray`, `escapeCsvValue`, `flattenObject`, `jsonArrayToCsv`). XML conversion uses `fast-xml-builder` (csv-to-xml) and `xml-js` (json↔xml); TOML uses `smol-toml`; URL query uses `qs`; YAML uses `js-yaml`. When adding a new data converter, follow the existing tool-forms pattern (see Conventions below).

## Directory Ownership / Entry Points

| Directory | Contents |
|---|---|
| `src/app/` | Next.js app router, page.tsx, layout.tsx, error.tsx, `[slug]/page.tsx`, `tools/page.tsx` (directory), route manifests |
| `src/components/` | UI primitives (shadcn), providers, result-panel, tool-shell, tool-forms, tool-runner, related-tools, search, upload-zone, command-palette |
| `src/hooks/` | `use-mobile.ts`, `use-isApple.ts`, `use-tool-history.ts` (recent/favorites localStorage) |
| `src/lib/` | `constants.ts`, `utils.ts` (cn helper using twMerge/clsx), `file-security.ts` (mime detection, sanitize, size utils) |
| `src/tools/` | Tool definitions, categories, search, and per‑category sub‑dirs: `data/`, `developer/`, `images/`, `pdf/`, `files/`, `text/`, `colors/`, `datetime/`, `converters/` |
| `src/types/tool.ts` | Shared types: `ToolDefinition`, `ToolOption`, `ProcessingMode`, `InputKind`, `OutputKind`, `ToolResult`, `ProgressFn`, `ProcessingContext`, `ToolProcessor` |

## Environment & Config

- **.env.local** holds `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_GITHUB_PROFILE_URL`. These are read via `src/lib/constants.ts`.
- **Next.js config** (`next.config.ts`) controls React compiler, caching, prefetching, and experimental features. Do not disable `cacheComponents` or `partialPrefetching` without re‑evaluating route instant‑navigation behavior.
- **ESLint** extends `eslint-config-next` and `eslint-config-next/typescript`. Ignores `.next/`, `out/`, `build/`, `next-env.d.ts` globally.

## Testing

- **Unit/component tests** (Vitest + React Testing Library, jsdom) live beside sources as `*.test.ts(x)`; run with `pnpm test`.
- **E2E tests** (Playwright) live in `e2e/`; run with `pnpm test:e2e`, filter with `pnpm test:e2e -- -g "<name>"`. See `TESTING.md` for conventions (hydration waits, error-alert scoping, output extraction, `@critical` cross-browser tagging).
- Deterministic fixtures live in `tests/fixtures/` — reuse them.
- When adding a tool, the registry-driven `e2e/all-tools.spec.ts` covers its page automatically; add deeper workflow tests in the relevant suite if the tool has unique behavior.

## Important Conventions

- **All tools are client‑side** (`processingMode: "client"`). No server‑side processing is set up; data never leaves the browser. Do NOT add Node-only libraries (e.g., `quicktype-core` imports `fs`/`readable-stream` — it breaks the client bundle; a previous `json-to-typescript` tool was removed for this reason).
- **Component naming**: Export a **named** function `<Name>Tool` (e.g., `CsvToJsonTool`). This is what `tool-loader.tsx` references. Always add `"use client"` at the top of tool components.
- **Form UI**: Text-based tools use the shared primitives in `src/components/tool-forms.tsx` (`ToolContainer`, `ToolField`, `ToolInput`, `ToolOutput`, `ToolCheckbox`, `ToolSelect`, `ToolError`, `ToolActions`, `ToolRow`). File-based tools use `ToolRunner` + `UploadZone`. Never hand-roll switches/selects/sliders — use the shadcn primitives.
- **Styling rules**: no `space-y-*` (use `flex flex-col gap-*`), no raw color classes (`bg-blue-500`, `text-red-500` — use shadcn variants / semantic tokens like `text-success`, `text-destructive`), no manual `dark:` color overrides (use tokens), `size-4` not `h-4 w-4`, icons in buttons use `data-icon="inline-start"`.
- **Copy/download feedback**: use `toast.success(...)` from sonner (see `ToolOutput` and existing tools). Never write to clipboard without await + try/catch.
- **Duplicates guard**: `definitions.ts` contains a dev-time check that console.errors on duplicate `slug`/`id`. Never add a slug that already exists.
- **Duplicate-slug guard**: `src/tools/definitions.ts` logs duplicate `slug`/`id` errors in dev — never register two tools with the same slug.
- **Dynamic imports**: Tool components are loaded via `next/dynamic` with a `loading` spinner. Keep the `loading` prop pattern when adding entries to `TOOL_COMPONENTS`.
- **Route generation**: `generateStaticParams()` in `src/app/tools/[slug]/page.tsx` maps over `toolDefinitions`. Adding/removing definitions changes the set of static params — rebuild (`pnpm build`) to regenerate.
- **Sitemap**: Auto‑generated from `toolDefinitions` in `src/app/sitemap.ts`. Each available tool gets `/tools/<slug>` entry with `priority: 0.7`. The `/tools` directory page must exist (it's in the sitemap).
- **Privacy banner** on the home page emphasizes: "Files never leave your device."
- **Branding**: use `appName` from `src/lib/constants.ts` — never hardcode "Devly"/"UtilityHub" in copy. GitHub link comes from `githubProfileUrl`.

## What to Check Before Submitting a New Tool

1. Definition added to `src/tools/definitions.ts` with all required fields.
2. Component file created at `src/tools/<category>/<slug>.tsx` exporting `<Name>Tool`.
3. `tool-loader.tsx` entry added with correct dynamic import path and loading spinner.
4. Run `pnpm lint` — fix any ESLint errors.
5. Run `pnpm dev` and verify the tool appears at `/tools/<slug>`, search works, and the download button functions.
6. If the tool uses external libraries (e.g., `fast-xml-parser`, `pdf-lib`), ensure the import syntax matches the library's exported API.

## Quick Reference: Category Icons & Keys

| Category | Icon (Lucide) |
|---|---|
| images | Image |
| pdf | FileText |
| files | FolderArchive |
| developer | Code2 |
| text | Type |
| data | Table |
| web | Globe |
| colors | Palette |
| datetime | CalendarClock |
| converters | Repeat2 |