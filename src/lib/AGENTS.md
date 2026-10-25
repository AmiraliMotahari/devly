# src/lib — Framework-Agnostic Utilities Layer

Parent: [`/AGENTS.md`](../AGENTS.md)

## Purpose

Pure, importable-from-anywhere modules. Borrowed by tools, components and tests alike. Must stay free of React and server-only code so it can run in the browser bundle and jsdom tests.

## Files

| File | Role |
| --- | --- |
| `constants.ts` | Runtime config read from `.env.local`: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_GITHUB_PROFILE_URL` → exports `appName`, `siteUrl`, `githubProfileUrl`. **The only place branding values come from** — never hardcode "Devly" in copy |
| `utils.ts` | `cn()` (twMerge + clsx) — the one class-merge helper |
| `file-security.ts` | MIME/magic-byte detection, filename sanitization, size utils. Security-sensitive: changes need tests |
| `file-validation.ts` | Zod schemas for validating user files (the only untrusted input in a client-only app) |
| `image-encode.ts` | Canvas → Blob encoding (`encodeCanvasToBlob`) with WebP fallback strategy: verify magic bytes after encoding, fall back to `@jsquash/webp` (WASM) — covers the WebKit bug where `toBlob` silently returns PNG. Pairs with `use-isApple` detection |
| `empty.ts` | Placeholder re-export used by dynamic imports |

## Rules

- Pure modules only: `src/lib` must not import React components, `"use client"` modules, or anything server-only (`fs`, `readable-stream`, …).
- Security-sensitive utilities (`file-security`, `file-validation`) change only with unit tests in `tests/unit/lib/`.
- Keep exports narrow — this directory is imported by nearly everything (high fan-out in the code graph).

## Connects

- Types used by: [`src/types/AGENTS.md`](../types/AGENTS.md)
- Consumed by: [`src/tools/AGENTS.md`](../tools/AGENTS.md) · [`src/components/AGENTS.md`](../components/AGENTS.md) · [`src/app/AGENTS.md`](../app/AGENTS.md)
