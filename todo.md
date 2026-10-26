# Todo

## V1

- [x]: General: Add reusable copy button (DRY)
- [x]: Color: Convert hex to oklch
- [x]: Color: Any to Any color convert (eg:hex to rbg, rbg to hex like google translate)
- [x]: Color: Copy/Paste css color vars and convert (eg: oklch to rbg ) -batched
- [x]: UUID: Add different uuid generation version (v4, v5,...)

- [x]: General: Change code based input/output blocks to code blocks with themed styles, line number something similar to vs-code (eg: highlight.js, react-syntax-highlighter)

- [x]: General: Redesign header with a more compact view (logo, home, categories, tools, search, theme-toggle, github). you should consider all sizes. best practices and modern and simple design.

- [x]: File: Password ZIP is currently only encrypting each file, fix the behavior and also add a decoder
- [x]: PDF: all pdf tools are just examples implement real production ready tools
- [x]: Fix: command-pallet code (identical options are shown, unpleasant ui)
- [x]: Add a new tool that encrypt/decrypt a text with a given password/key

- [x]: Tests: Generate comprehensive test units (vitest, playwright)
- [x]: Tests: Move all test, e2e files to /tests for better management

- [x]: Web: use my qr-code(from my other project) located at "/"
- [x]: Web: Add barcode generator

- [x]: Use "@jsquash/webp" for image compression (WebP encoding fallback for Safari)
- [x]: Use react-upload-zone for better capability
- [x]: Add zod for validation and better ux (file validation — the one untrusted input in a client-only app)
- [x]: Add currency exchange using Frankfurter API.

- [x]: Update readme.md (roadmap CI/CD line dropped; pointer to per-layer AGENTS.md guides added)

- [x]: Cleanup: Remove unused packages (15 removed: three/@react-three-*, marked, papaparse, json-2-csv, fast-xml-parser, html-minifier, diff, qrcode, clsx, tailwind-merge + 2 @types)
- [x]: pdf, file and images needs to be rewritten from ground up with a real architecture (all three domains done: file (6 tools) + image (15 simple tools) + PDF (8 tools) behind src/tools/<domain>/processing/pipeline.ts; no tool file imports pdf-lib/pdfjs-dist/JSZip/createImageBitmap directly; progress/errors/downloads come from shared pipelines; unit tests added for pure logic; E2E suites untouched as regression net)

- [x]: Optimization: Add instant navigation, prefetching, cache-components
- [x]: CI/CD: add github workflow (.github/workflows/ci.yml — lint + type:check + vitest + build on push/PR; Playwright e2e deliberately left local for now)

## V2

- [x]: Full PWA implementation (manifest fixed — the icons 404'd, so the app was not installable; service worker added)
- [x]: Use offline (network-first service worker: the app loads with the network off; shell precached at idle; the one network tool queues its request until the connection returns)

### V2 — Product-ready (in progress)
- [x] Security headers (CSP, X-Frame-Options, nosniff, Referrer-Policy on all routes; Cache-Control + Content-Type on /sw.js) — per Next.js PWA guide §8
- [x] Manifest completeness (any-purpose icons, screenshots, shortcuts for top 5 tools, lang/dir)
- [x] Install prompt UX (dismissible header button, iOS "Add to Home Screen" instructions)
- [x] Service worker update flow (controllerchange → "new version available" toast with reload; gate skipWaiting behind user confirmation; updateViaCache: 'none')
- [x] Cache versioning (build-hash-derived cache name instead of hardcoded "devly-v1")
- [x] Branded offline fallback page (/offline instead of raw 503)
- [x] Network status surface (persistent pill in header, not just toast)
- [x] Currency offline queue hardening (visibilitychange retry, exponential backoff, persisted stale rates, "last updated" display)
- [x] LRU cache eviction (100 MB cap, oldest-first, exempt precached shell)
- [x] "Download for offline" button (fully opt-in precache of all tool routes; no background precaching)
- [x] HTTPS dev testing docs (pnpm dev:https script)

## V3

- [ ]: AI/chat-box: Simple ai chat box using shadcn latest components
- [ ]: AI/blog-writer: an SEO expert who first ask questions, r&ds then proceeds to write a post for a blog (available to download as .md, .txt, .html, ...)
- [ ]: AI/seo-analyzer: An SEO expert who finds in and out of a given website anf suggest areas of improvement with step by step guides

## V4

- [ ]: Video tools
- [ ]: Audio tools

## V5

- [ ]: Implement server side generations for tools that need or offer better result if ran on the server. Todo this first plan what must be done, design the architecture and before you start it ask me for the tech stack. This must be wired to a central orchestrator for actions like rate-limit, analytics and etc.
- [ ]: Admin dashboard
- [ ]: Admin Analytics
- [ ]: Admin Profile
- [ ]: Auth Pages ("/auth/login", "/auth/signup", "/auth/forgot-password, "/auth/reset-password", "/auth/verify-email",)
- [ ]: AUTH "Better-Auth config" (email-and-password, admin-plugin, have-i-been-pwned plugin, RBAC: supper-admin, admin)
- [ ]: Database "Drizzle-orm, postgreSQl, redis"
- [ ]: Validation "Zod"
- [ ]: Forms "react-hook-form"
- [ ]: Server-Actions "next-safe-actions"
- [ ]: Qeue "rabbitMQ"
- [ ]: openTelementry
- [ ]: Rate-limit
- [ ]: Captcha "cloudflare"
