# src/types — Shared Contracts Layer

Parent: [`/AGENTS.md`](../AGENTS.md)

## Purpose

The type vocabulary shared by the tool catalog, components, pages and tests. One file, one job: keep the layers honest with each other.

## Files

| File | Exports |
| --- | --- |
| `tool.ts` | `ToolDefinition`, `ToolOption`, `ToolResult`, `ToolProcessor`, `ProcessingContext`, `ProgressFn`; `ProcessingMode` (`"client" \| "server" \| "hybrid"`), `InputKind` (`"file" \| "text" \| "none"`), `OutputKind` (`"file" \| "text" \| "image" \| "none"`), `ToolCategory` |

## Rules

- **Change here means change downstream**: `ToolDefinition` feeds route generation, search, sitemap, related-tools and SEO surfaces. Evolving it is fine — the README notes "the exact shape may evolve" — but update `definitions.ts`, `tool-loader.tsx`, and the relevant pages in the same change.
- `ProcessingMode` contains `"server" | "hybrid"` reserved for the V5 orchestrator plan (`todo.md`, `processing-architecture.md`). Those values exist as contracts only — no server-side implementation yet, and none until V5's architecture is designed.
- Prefer editing this file over re-declaring ad-hoc duplicates of `ToolDefinition` shapes elsewhere.

## Connects

- Implemented by: [`src/tools/AGENTS.md`](../tools/AGENTS.md)
- Consumed via props by: [`src/components/AGENTS.md`](../components/AGENTS.md) · [`src/app/AGENTS.md`](../app/AGENTS.md)
