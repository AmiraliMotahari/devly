# src/components — Shared UI Layer

Parent: [`/AGENTS.md`](../AGENTS.md)

## Purpose

Every reusable UI building block in the app. Pages and tools must never hand-roll what already exists here. Two sub-groups: application components (this dir) and shadcn primitives (`ui/`).

## Files

| Path | Role |
| --- | --- |
| `tool-loader.tsx` | `TOOL_COMPONENTS` registry: slug → dynamic `import()` with `loading` spinner. **Every tool must be registered here** — an unregistered definition renders nothing |
| `tool-forms.tsx` | Text-tool primitives: `ToolContainer`, `ToolField`, `ToolInput`, `ToolOutput`, `ToolCheckbox`, `ToolSelect`, `ToolError`, `ToolActions`, `ToolRow` — includes copy/download feedback via `toast.success` |
| `tool-runner.tsx` | File-tool orchestrator: connects `upload-zone` → processing → `result-panel` |
| `tool-shell.tsx` | Shared tool page layout (header, description, FAQ, how-it-works, related tools) |
| `upload-zone.tsx` | Drag/drop + paste + previews + validation + removal. House implementation — do not swap for a library without a roadmap decision (see `todo.md` V1 note on react-upload-zone) |
| `result-panel.tsx` | Output display + download |
| `related-tools.tsx` | Renders `relatedToolSlugs` from the definition |
| `search/`, `general-search.tsx`, `command-palette.tsx` | Search UIs over `src/tools/search.ts` index |
| `providers/` | `theme.provider.tsx` (next-themes), mounted in `src/app/layout.tsx` |
| `offline-indicator.tsx` | PWA surface (online/offline pill + toast) |
| `install-prompt.tsx` | Install prompt (dismissible, iOS instructions) |
| Serwist (via `SerwistProvider` in `src/app/layout.tsx`) | Service worker is now served via `/serwist/sw.js` route handler (`src/app/serwist/[path]/route.ts`) with `swSrc: "app/sw.ts"` |
| `code-block/` | Shiki-based themed code blocks with line numbers; `highlighter.tsx` uses lazy grammars (`LAZY_GRAMMARS`) |
| `copy-to-clipboard.tsx`, `favorite-button.tsx`, `theme-toggle.tsx`, `logo.tsx`, `site-header.tsx`, `site-footer.tsx`, `error-boundary.tsx` (#ErrorFallback) | App chrome |
| `ui/` | 26 shadcn primitives (button, card, dialog, dropdown-menu, select, sheet, slider, sonner, tabs, tooltip, kbd, …). Managed by shadcn CLI — don't hand-edit structure |

## Rules

- `"use client"` at the top of any component using state, effects, or browser APIs.
- **Styling**: no `space-y-*` (use `flex flex-col gap-*`); no raw color classes (`bg-blue-500`, `text-red-500`) — use shadcn variants or semantic tokens (`text-success`, `text-destructive`); no manual `dark:` overrides; `size-4` over `h-4 w-4`; icons in buttons use `data-icon="inline-start"`.
- **No duplicated logic**: if a new tool page needs a switch/select/slider/copy button, use the existing primitive — never hand-roll one in a tool.
- **Clipboard**: `navigator.clipboard` always behind `await` + `try/catch`, success feedback via `toast.success`.
- `ui/` changes ripple app-wide — the shadcn `Button`/`Card` hubs are the highest-fanout nodes in the app; keep them stable and additive.

## Connects

- Renders tools from: [`src/tools/AGENTS.md`](../tools/AGENTS.md) (via `tool-loader`)
- Consumes types from: [`src/types/AGENTS.md`](../types/AGENTS.md)
- Used by pages in: [`src/app/AGENTS.md`](../app/AGENTS.md)
- Root conventions: [`/AGENTS.md`](../AGENTS.md) ("Form UI", "Styling rules")
