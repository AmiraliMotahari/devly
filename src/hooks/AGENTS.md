# src/hooks — React Hooks Layer

Parent: [`/AGENTS.md`](../AGENTS.md)

## Purpose

Small reusable behavior layer bridging React components to browser/local APIs. No layouts, no tool logic — just behavior.

## Files

| File | Role |
| --- | --- |
| `use-mobile.ts` | Touch/viewport breakpoint detection (ssr-safe) |
| `use-media-query.ts` | Generic `matchMedia` subscription |
| `use-isApple.ts` | Apple/browser detection used by the WebP encoding fallback (`src/lib/image-encode.ts`) |
| `use-object-urls.ts` | Create/revoke object URLs without leaks — use this over raw `URL.createObjectURL` |
| `use-tool-history.ts` | Recent/favorites per tool, persisted in localStorage (drives `favorite-button.tsx`) |

## Rules

- Client-side behavior only; nothing here may import Node-only modules.
- Clean up every subscription/URL/timer — an SSR exception will crash the app shell.
- If logic starts mixing UI feedback (`toast`, JSX), it belongs in `src/components`, not here.

## Connects

- Consumed by: [`src/components/AGENTS.md`](../components/AGENTS.md) and [`src/tools/AGENTS.md`](../tools/AGENTS.md)
- Relies on: [`src/lib/AGENTS.md`](../lib/AGENTS.md)
