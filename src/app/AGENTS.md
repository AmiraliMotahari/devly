# src/app — Routing, Pages & Metadata Layer

Parent: [`/AGENTS.md`](../AGENTS.md)

## Purpose

Next.js App Router shell. Every URL the app serves lives here, plus all generated metadata (sitemap, robots, manifest, OG images). Pages are thin: they read tool category metadata and delegate rendering to `src/components`/`src/tools`.

## Files

| Path | Role |
| --- | --- |
| `layout.tsx` | Root layout: `ThemeProvider`, `SiteHeader`/`SiteFooter`, `Toaster` (sonner), `TooltipProvider`, `OfflineIndicator`, `ServiceWorker`; Geist + Geist Mono fonts; metadata built from `appName`/`siteUrl` (`src/lib/constants.ts`) |
| `page.tsx` | Home. Category cards via `CATEGORY_META` + `ICON_MAP`, `POPULAR_SLUGS` quick links, privacy banner ("Files never leave your device") |
| `tools/page.tsx` | `/tools` directory listing all registered tools |
| `tools/[slug]/page.tsx` | One page per tool: `generateStaticParams()` + `generateMetadata()` from `toolDefinitions`; renders the tool via the `tool-loader` registry |
| `category/[category]/page.tsx` | One page per tool category from `CATEGORY_META` |
| `about/`, `privacy/` | Static content pages |
| `graphify/page.tsx` | Dev-only page displaying graphify usage (not a tool, not in the catalog) |
| `error.tsx`, `global-error.tsx`, `not-found.tsx` | Error/fallback boundaries |
| `sitemap.ts`, `robots.ts`, `manifest.ts` | Generated from `toolDefinitions` / constants |
| `icon*`, `apple-icon`, `opengraph-image*` | Favicon and social preview assets |

## Rules

- **Never hardcode tool data here.** Pages must derive from `toolDefinitions` (`src/tools/definitions.ts`) and `CATEGORY_META` (`src/tools/categories.ts`). Adding a tool must not require editing anything in this directory.
- **Instant navigation is a feature, not an option**: `cacheComponents` + `partialPrefetching` are enabled in `next.config.ts`. Keep route shells prerenderable; wrap client-only islands in `Suspense` (see `layout.tsx`). Do not add blocking data fetches to static shells.
- **Route bookkeeping**: changes to `toolDefinitions` change the static-params set — a rebuild (`pnpm build`) is required to regenerate routes/sitemap. `tests/e2e/instant-nav.spec.ts` and `app-shell.spec.ts` guard this behavior.
- **Metadata hygiene**: new public pages get OG metadata; the sitemap must stay accurate (`/tools`, `/category/<key>` pages are pinned in it).
- **Auth placeholders**: `/auth/*` pages in `todo.md` V5 are not built — do not pre-create stubs.

## Connects

- Reads: `src/tools/definitions.ts`, `src/tools/search.ts`, `src/tools/categories.ts`
- Renders: `src/components/tool-loader.tsx`, `src/components/site-*`
- Sibling layer docs: [`src/components/AGENTS.md`](../components/AGENTS.md) · [`src/tools/AGENTS.md`](../tools/AGENTS.md)
