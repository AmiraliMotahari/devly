# src/tools — Tool Catalog & Implementations Layer

Parent: [`/AGENTS.md`](../AGENTS.md)

## Purpose

The heart of the app: 88 tool definitions in `definitions.ts` — the single source of truth feeding routes, pages, search, sitemap, related-links and SEO — plus one UI component per tool and shared per-domain logic. Client-side only; user data never leaves the browser (the sole exception: currency converter → Frankfurter API, codes only).

## Files

| Path | Role |
| --- | --- |
| `definitions.ts` | All 88 `ToolDefinition` entries. Dev-time guard console.errors on duplicate `slug`/`id` — never register two of either |
| `categories.ts` | `CATEGORY_META`: category key → label/description/icon (keys: `images`, `pdf`, `files`, `developer`, `text`, `data`, `web`, `colors`, `datetime`, `converters`; note key `images` maps to dir `image/`) |
| `index.ts` | Barrel for tool modules |
| `search.ts` | Search index built from `toolDefinitions` — no per-tool registration |
| `tool-props.ts` | Shared component prop helper wrapped around `ToolDefinition` |
| `<category>/<slug>.tsx` | One "use client" component per tool, named export `<Name>Tool` accepting `ToolComponentProps` |
| `data/lib.ts` | Shared parse/serialize helpers (`csvToArray`, `escapeCsvValue`, `flattenObject`, `jsonArrayToCsv`) used by all data converters |
| `image/editor/` | Advanced Image Editor UI: `state.ts` (reducer, `EditorMode`, `HISTORY_LIMIT`), canvas, layers panel, toolbar, export dialog, collage, overlays |
| `image/processing/` | Pure render/geometry/adjustment/export logic (`render.ts`, `geometry.ts`, `adjustments.ts`, `export.ts`, `errors.ts`) — no UI imports |
| `image/types/`, `image/shared.ts` | Editor types + shared image helpers |
| `processors/` | Empty today — reserved landing spot for the one-pipeline-per-domain rewrite in `processing-architecture.md` (file → image → PDF migration order) |
| `converters/currency.ts` | The only networked module: Frankfurter exchange rates. Sends currency codes only, never files |

## Rules

- **Adding a tool** = definition + component + `tool-loader` registration. Full checklist in [`/AGENTS.md`](../AGENTS.md) ("What to Check Before Submitting a New Tool").
- **`processingMode: "client"` always.** No Node-only libraries (e.g. `quicktype-core` breaks the client bundle — a prior `json-to-typescript` tool was removed for exactly this). Check whether a library ships browser builds before adding it.
- **Definition completeness**: `keywords`, `relatedToolSlugs`, `faq`, `howItWorks` drive SEO surfaces — never ship a definition with these empty.
- Validate user-supplied file inputs with `file-validation.ts` (zod) — files are the one untrusted input in a client-only app.
- **Editor architecture**: keep UI (`editor/`) and pure processing (`processing/`) separated; processing modules must stay importable by both components and tests.
- **New pipe-through format?** Check `features.todo.md` before building ad-hoc; "Universal Converter/Analyzer" workflows are planned — prefer extensibility toward them.

## Connects

- Types: [`src/types/AGENTS.md`](../types/AGENTS.md) (`ToolDefinition`, `ToolResult`, …)
- Registered in: [`src/components/AGENTS.md`](../components/AGENTS.md) (`tool-loader.tsx`)
- Served by routes in: [`src/app/AGENTS.md`](../app/AGENTS.md)
- Helpers: [`src/lib/AGENTS.md`](../lib/AGENTS.md)
