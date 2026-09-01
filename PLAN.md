# Devly — Improvement & Feature Plan

> Generated from a full codebase audit (2026-09-01) plus the product feature roadmap.
> Work through phases in order; each phase ends with a verification checklist.
> Track progress with the checkboxes `[ ]`.

---

## Table of contents

- [Audit findings (condensed)](#audit-findings-condensed)
- [Phase 1 — Fix breakage (P0)](#phase-1--fix-breakage-p0)
- [Phase 2 — Search, nav & personalization](#phase-2--search-nav--personalization)
- [Phase 3 — Robustness fixes](#phase-3--robustness-fixes)
- [Phase 4 — Design-system sweep](#phase-4--design-system-sweep)
- [Phase 5 — Polish & docs](#phase-5--polish--docs)
- [Phase 6 — Feature roadmap](#phase-6--feature-roadmap)
- [New tool checklist](#new-tool-checklist)
- [Global verification checklist](#global-verification-checklist)

---

## Audit findings (condensed)

### P0 — Bugs (broken or incorrect behavior)

| # | Finding | Location |
|---|---|---|
| 1 | `json-to-typescript` tool is 100% commented out but registered & `available: true` → route crashes | `src/tools/data/json-to-typescript.tsx:1-126`, `src/components/tool-loader.tsx:422`, `src/tools/definitions.ts:1907` |
| 2 | Duplicate `unit-converter` definition → doubled search results, inflated tool counts, duplicate static param | `src/tools/definitions.ts:1578` and `:2218` |
| 3 | Sitemap lists `/tools` but no `/tools` page exists → 404 for crawlers | `src/app/sitemap.ts` |
| 4 | "Recently used" / "Favorites" read `localStorage` but nothing ever writes → ghost UI + hydration mismatch | `src/components/command-palette.tsx:22-36`, `src/components/general-search.tsx:25-39` |
| 5 | Brand leak: "UtilityHub" hardcoded in home privacy banner | `src/app/page.tsx:238` |
| 6 | Header GitHub link hardcodes `https://github.com`; `githubProfileUrl` constant never used | `src/components/site-header.tsx:143`, `src/lib/constants.ts:4` |
| 7 | `Ctr` typo in keyboard hint | `src/components/site-header.tsx:128` |
| 8 | Header search trigger dispatches a synthetic KeyboardEvent — not keyboard accessible | `src/components/site-header.tsx:110-135` |
| 9 | "Cancel" during batch processing doesn't cancel — signal never checked between files | `src/components/tool-runner.tsx:72-91` |

### P1 — UX / correctness issues

| # | Finding | Location |
|---|---|---|
| 10 | UploadZone validates size only, never file type → cryptic late failures | `src/components/upload-zone.tsx:46-51` |
| 11 | UploadZone leaks preview object URLs on unmount; dead `export { Progress }` | `src/components/upload-zone.tsx:112-120, 218` |
| 12 | Cron parser silently discards 6th field of 6-field expressions | `src/tools/developer/cron-parser.tsx:109-118` |
| 13 | Result panel can render negative "Saved" % when output is larger | `src/components/result-panel.tsx:56` |
| 14 | extract-zip flattens to basename → name collisions, one file overwrites another in ZIP | `src/tools/files/extract-zip.tsx:51-54` |
| 15 | Nav omits 3 of 10 categories (`data` — 14 tools — `colors`, `datetime`) | `src/components/site-header.tsx:25-34` |
| 16 | Home page: "Featured utilities" duplicates "Popular tools" cards | `src/app/page.tsx:53-59` |

### P2 — Styling / consistency debt

| # | Finding | Location |
|---|---|---|
| 17 | ~28 tool components bypass the design system: raw `bg-blue-500`/`bg-green-500` buttons, `text-red-500` errors, manual `dark:bg-gray-900`, native `<select>`/checkbox, `space-y-*`, no focus rings | `src/tools/data/*`, `src/tools/developer/*`, `src/tools/text/*`, `src/tools/web/*`, `src/tools/converters/unit-converter.tsx` |
| 18 | `tool-runner` hand-rolls switch/select/slider/number controls instead of shadcn primitives | `src/components/tool-runner.tsx:168-263` |

### P3 — Minor polish

| # | Finding | Location |
|---|---|---|
| 19 | `/category` metadata title is just "Category" | `src/app/category/page.tsx:34` |
| 20 | `manifest.ts` hardcodes "Devly" instead of `appName` | `src/app/manifest.ts` |
| 21 | 5 lint warnings (unused imports) | `color-converter.tsx:19`, `compress-image.tsx:5`, `resize-image.tsx:5`, `shared.ts:3-4` |
| 22 | Error page claims "Our team has been notified" — no telemetry exists | `src/app/error.tsx:35` |
| 23 | Copy buttons are silent; sonner wired but unused for feedback | various tools |
| 24 | `AGENTS.md` stale (csv-to-xml bug already fixed; new conventions undocumented) | `AGENTS.md` |

---

## Phase 1 — Fix breakage (P0)

**Goal:** every route in the sitemap renders; no crashes; no duplicate data.

### 1.1 Remove duplicate `unit-converter` definition

- [ ] Delete the second entry (`src/tools/definitions.ts` ~line 2216-2249); keep the first (~line 1576).
- [ ] Add a dev-time guard so this can't regress — e.g. in `definitions.ts`:

```ts
if (process.env.NODE_ENV !== "production") {
  const seen = new Set<string>();
  for (const t of toolDefinitions) {
    if (seen.has(t.slug)) console.error(`Duplicate tool slug: ${t.slug}`);
    if (toolDefinitions.filter((x) => x.id === t.id).length > 1)
      console.error(`Duplicate tool id: ${t.id}`);
    seen.add(t.slug);
  }
}
```

- [ ] Verify home badge tool count drops from 65 → 64.

### 1.2 Restore `json-to-typescript` with quicktype-core

**Decision: use `quicktype-core`** (installed in package.json; end result is materially better than hand-rolled inference: unions, optional detection, enum handling). The original commented implementation was already written against the correct API.

- [ ] Uncomment `src/tools/data/json-to-typescript.tsx`, restore `"use client"` directive.
- [ ] Verify the `quicktype-core` ESM bundle works in the browser: it targets Node & browser; if `quicktype-core` pulls in Node built-ins at runtime, dynamic-import it inside the handler (`const { quicktype, ... } = await import("quicktype-core")`) to keep it out of the initial chunk.
- [ ] Replace raw buttons/textarea with the shared form primitives from Phase 4.1 (do this when sweeping `data/`, or immediately if Phase 4 data/ sweep runs first).
- [ ] **Fallback plan:** if quicktype proves unusable client-side (bundle errors, memory), hand-roll a lightweight JSON→TS generator: walk value tree, emit `interface Root { ... }`, optional keys when arrays of objects have differing keys, union types for mixed primitives. Smaller bundle, fewer moving parts — but only as fallback.
- [ ] Verify at `/tools/json-to-typescript` with sample: `{"name":"John","age":30,"roles":["admin","user"]}` → emits `interface Input { name: string; age: number; roles: string[]; }`.

### 1.3 Add real `/tools` directory page (fixes sitemap 404)

**Decision: build the page** (good UX + SEO), not just remove the sitemap entry.

- [ ] Create `src/app/tools/page.tsx` (note: coexists fine with `tools/[slug]/page.tsx`).
- [ ] Content: all tools grouped by category, with:
  - Category section headers (icon + label + count)
  - Tool cards linking to `/tools/<slug>` (reuse the Card pattern from `src/app/category/[category]/page.tsx`)
  - `generateMetadata` → title "All tools", description with keywords
- [ ] Add an "All tools" link to the header nav (see 2.3) and footer.
- [ ] Verify `/tools` returns 200 and lists 64 unique tools.

### 1.4 Brand & link fixes

- [ ] `src/app/page.tsx:238`: "UtilityHub" → `{appName}`.
- [ ] `src/components/site-header.tsx:143`: `https://github.com` → `{githubProfileUrl}`; hide the GitHub button entirely when the constant is empty (default `""`).
- [ ] `src/components/site-header.tsx:128`: `Ctr` → `Ctrl`.
- [ ] Remove dead `!isMobile ? … : <></>` branch inside the `hidden sm:flex` InputGroup (it's always non-mobile there).

### Phase 1 verification

- [ ] `pnpm lint` passes
- [ ] `pnpm build` succeeds; static params = 64 unique tool slugs
- [ ] `/tools/json-to-typescript` works end-to-end
- [ ] Search "unit" shows Unit Converter once
- [ ] `/tools`, `/`, `/tools/json-to-typescript` all render without console errors

---

## Phase 2 — Search, nav & personalization

### 2.1 Proper header search trigger

Replace the synthetic-KeyboardEvent hack (`site-header.tsx:110-135`).

- [ ] Render a real focusable trigger: `<Button variant="outline" role="combobox" aria-label="Search tools">` styled to look like the current search field (or keep `InputGroup` composition but add `tabIndex={0}`, `role="button"`, keyboard `Enter`/`Space` handling, and visible focus ring).
- [ ] Call a shared open function instead of dispatching events: lift the command palette open state (e.g., a tiny context or a custom `document` event the palette subscribes to — prefer context).
- [ ] Keep ⌘K/Ctrl+K shortcut.

### 2.2 Implement recent/favorites write-path

**Decision: implement** (small effort, makes the palette genuinely useful).

- [ ] Create `src/hooks/use-tool-history.ts` (client) with:
  - `RECENT_KEY` / `FAVORITE_KEY` constants (single source of truth — remove duplicates from `command-palette.tsx` and `general-search.tsx`)
  - `recordToolVisit(slug)` — unshift, dedupe, cap at 20, `try/catch` around `localStorage.setItem` (private browsing)
  - `toggleFavorite(slug)`, `isFavorite(slug)`
  - `getRecentSlugs()`, `getFavoriteSlugs()`
- [ ] Record visits: in `ToolShell` (client boundary) or a small `<ToolVisitRecorder slug={tool.slug} />` client component mounted in `src/app/tools/[slug]/page.tsx`. Use `useEffect`, not render-time (fixes hydration mismatch).
- [ ] Move all `localStorage` reads in `command-palette.tsx` and `general-search.tsx` into `useEffect` + state so server render matches first client render.
- [ ] Add a star toggle: in the command palette rows and on the tool page header (next to the title). Toggle updates localStorage and re-renders lists.
- [ ] Use distinct icons: `Star` (amber) for favorites, `Clock` for recent — `general-search.tsx:125,149` currently show stars for recents/categories (wrong icon).

### 2.3 Nav categories

**Decision: group smaller categories under a "More" dropdown** (avoids a 10-link cluttered nav; all 10 remain reachable; mobile sheet lists everything).

- [ ] Desktop nav: keep Images, PDF, Files, Developer, Text, Converters + new "More" `DropdownMenu` containing **Data, Web, Colors, Date & Time** (Web is large — consider promoting Web and dropping Converters into "More" instead; decide by link size at 1280px).
- [ ] Add "All tools" link (→ `/tools` from Phase 1.3) — likely inside "More" or as the first nav item.
- [ ] Mobile `Sheet` nav: list all 10 categories + All tools.
- [ ] Footer already lists all categories — keep.

### Phase 2 verification

- [ ] Keyboard user can Tab to header search and open palette with Enter
- [ ] Visiting a tool then opening the palette shows it under "Recently used"
- [ ] Starring a tool shows it under "Favorites"; star persists across reload
- [ ] No hydration warnings in console
- [ ] All 10 categories + All tools reachable from header on desktop and mobile

---

## Phase 3 — Robustness fixes

### 3.1 Real cancel in ToolRunner

- [ ] In `tool-runner.tsx` processing loop, check `ctx.signal.aborted` at the top of each iteration; `break` and set error "Processing was cancelled." without marking partial results as success (decide: keep completed results or clear — keep, and show partial note).
- [ ] Pass the signal into processors that support chunked work (image conversions are fast; PDFs can be slow). At minimum, abort between files.

### 3.2 UploadZone validation & cleanup

- [ ] Validate against `accept` (extension + MIME prefix match) when provided; mark mismatches `status: 'invalid'` with message `Not a supported file type (expects: …)`.
- [ ] Revoke all remaining `previewUrl`s on unmount (`useEffect` cleanup).
- [ ] Remove dead `export { Progress }` (`upload-zone.tsx:218`) and unused import.

### 3.3 ResultPanel honest stats

- [ ] When `totalOutput >= totalOriginal`, show neutral state: "Output size: X (conversion may increase size for some formats)" instead of negative "Saved" %.
- [ ] Per-file badge: same treatment — show `+12%` as a neutral secondary badge, not success-colored.

### 3.4 extract-zip collisions

- [ ] Dedupe colliding basenames: append ` - 2`, ` - 3` before the extension (or preserve one safe path segment: `folder-a/readme.txt` → `folder-a__readme.txt`).
- [ ] Add a visible note when collisions were renamed.

### 3.5 Cron parser 6-field input

- [ ] Reject 6-field expressions with a clear error: "Seconds-based (6-field) cron expressions are not supported yet. Use the standard 5-field format." (Or implement seconds properly if cheap: extend `FIELD_RANGES` and `matches()` — ~30 lines. Prefer supporting it.)

### Phase 3 verification

- [ ] Cancel mid-batch stops before next file
- [ ] Dropping a `.txt` on "JPG to WebP" shows an inline invalid state, not a cryptic error
- [ ] Extract a zip with two same-named files → both extract with distinct names
- [ ] PNG→JPG conversion where output is larger shows neutral messaging

---

## Phase 4 — Design-system sweep

**Decision: start with `data/` + `developer/`, then iterate.** Order: data/ → developer/ → text/ → web/ → remaining one-offs.

### 4.1 Shared tool form primitives

Create `src/components/tool-forms.tsx` (or `src/components/tool/`) — the mechanical building blocks so each tool conversion is a small diff:

- [ ] `ToolField` — label + control + help text wrapper (`<Field>`-style semantics, `htmlFor`/`id` wiring)
- [ ] `ToolTextarea` — monospace, `min-h-48`, shadcn `Textarea` with `font-mono` variant
- [ ] `ToolSelect` — shadcn `Select` wrapper (label + items)
- [ ] `ToolCheckbox` — shadcn `Checkbox` + `Label` row
- [ ] `ToolError` — `<Alert variant="destructive">` replacement for `text-red-500` errors
- [ ] `ToolResultBox` — output `<pre>`/copy block: `bg-muted` (not `bg-gray-50`), `overflow-auto`, copy button (with toast — see 5.4)
- [ ] `ToolActions` — Button row: primary `Button` ("Convert"), secondary/outline (Download), ghost (Clear)

Conventions (enforced everywhere):
- No raw color classes (`bg-blue-500`, `text-green-600`…) → `Button` variants, `text-success`/`text-destructive` tokens
- No manual `dark:` color overrides → semantic tokens
- `gap-*` not `space-y-*`
- `size-4` not `h-4 w-4` for icons; icons in buttons use `data-icon="inline-start"`
- Every interactive control keyboard-focusable (shadcn primitives give this for free)

### 4.2 tool-runner controls → shadcn

- [ ] Install missing primitives: `pnpm dlx shadcn@latest add switch slider select checkbox tabs`
- [ ] `tool-runner.tsx:168-263`: replace hand-rolled switch → `Switch`, range slider → `Slider`, native select → `Select`, number/text → `Input` (type number/text). Keep label + help layout.

### 4.3 Sweep `data/` (14 tools)

Files: `csv-to-json`, `csv-to-xml`, `json-to-csv`, `json-to-json-schema`, `json-to-sql`, `json-to-toml`, `json-to-typescript`, `json-to-url-query`, `json-to-xml`, `json-to-yaml`, `toml-to-json`, `url-query-to-json`, `xml-to-json`, `yaml-to-json` + shared `lib.ts`.

- [ ] Mechanical conversion per file to the 4.1 primitives (~30-60 min/file after the first two set the pattern)
- [ ] While in each file: use the installed-but-unused parsing libs where they beat hand-rolled regex — **`papaparse`** for `csvToArray` (proper quoted-field/newline-in-field handling — current regex in `lib.ts:15-22` breaks on multi-line quoted cells), **`qs`** already used for URL query, consider `smol-toml` (already used). `fast-xml-parser` is installed but unused — `xml-to-json`/`json-to-xml` currently use `xml-js`; evaluate swapping to `fast-xml-parser` (better spec compliance, one fewer XML dep). Pick one XML lib and remove the other from package.json.
- [ ] Replace silent copy actions with toast feedback (see 5.4)

### 4.4 Sweep `developer/` (11 tools)

Files: `base64-encode-decode`, `cron-parser`, `hash-generator`, `json-formatter`, `json-minifier`, `json-schema-generator`, `jwt-decoder`, `url-encode-decode`, `uuid-generator`, `xml-formatter`, `yaml-formatter`.

- [ ] Same mechanical conversion.
- [ ] `jwt-decoder.tsx` and others missing `"use client"` — they work only because they're dynamically imported from a client boundary; add the directive explicitly (it's already implied by loader, but be consistent with the other 21 files that have it).
- [ ] Same for `text/`, `data/` files missing the directive (`csv-to-xml`, `json-to-yaml`, etc. — full list in audit).

### 4.5 Next iterations (after data/ + developer/ ships)

- [ ] `text/` (9 tools) — note `markdown-to-html.tsx` uses a hand-rolled renderer despite `marked` being installed; swap to `marked` (with `escapeHtml` handling it already has) or keep custom if tests depend on it — decide during sweep
- [ ] `web/` (4 tools)
- [ ] `colors/`, `datetime/`, `converters/` one-offs
- [ ] `site-footer.tsx` raw `text-emerald-500` → `text-success`; `about/page.tsx` raw colors

### Phase 4 verification (per batch)

- [ ] `pnpm lint` clean
- [ ] Visual pass in light + dark mode for every converted tool
- [ ] Keyboard-only pass: tab through every control, visible focus rings
- [ ] Every tool still functions (paste sample input → convert → download)

---

## Phase 5 — Polish & docs

- [ ] 5.1 Fix 5 lint warnings (unused imports: `rgbToHex` in color-converter, `ProcessingContext` in compress/resize-image, `ToolRunner`+`ToolComponentProps` in image/shared.ts)
- [ ] 5.2 `src/app/category/page.tsx:34` metadata → title "All categories" + description
- [ ] 5.3 `src/app/manifest.ts` → use `appName` from constants
- [ ] 5.4 Toasts for copy/download actions: `sonner` is wired (`<Toaster richColors />` in layout) — add `toast.success("Copied to clipboard")` to all copy buttons (centralize in the primitives from 4.1)
- [ ] 5.5 Error page copy: replace "Our team has been notified" with honest text ("The error has been logged to your browser console" + digest display)
- [ ] 5.6 Home page dedupe: make "Featured utilities" exclude `POPULAR_SLUGS` (or make it category-rotating)
- [ ] 5.7 Update `AGENTS.md`: csv-to-xml fixed (uses `fast-xml-builder` correctly now), json-to-typescript restored, new tool-form conventions, the real dev commands (`pnpm lint` script is `eslint`), note the duplicate-slug guard

---

## Phase 6 — Feature roadmap

Ground rules:
- **Everything stays client-side** (privacy is the core promise). Tools that fundamentally need a server (marked ⛔) go on a "someday, clearly-labeled" list — never silently upload user data.
- **Use libraries when the end result is better** (user decision). Hand-roll only trivial logic.
- Every tool follows the [New tool checklist](#new-tool-checklist).

### 6.0 Existing coverage — gaps adjacent to current tools (do these FIRST, infra exists)

Highest ROI: the detection, runner, and UX already work; these are one component + one definition each.

| Gap | Notes | Library |
|---|---|---|
| JPG → PNG | Missing one direction; png-to-jpg exists | canvas (existing `shared.ts` `convertImage`) |
| Images → PDF | No images-to-pdf tool; pdf-lib installed | `pdf-lib` |
| Crop image | Resize/rotate/flip exist; crop is the obvious missing edit | canvas |
| Add watermark to image | Roadmap asks for it; canvas compositing | canvas |
| PDF → text | pdfjs-dist installed & used for pdf-to-images | `pdfjs-dist` |
| JSON diff | `diff` package installed, used in text-diff | `diff` |
| JSON validator | Cheap: parse + error position | — |
| Sort lines / remove duplicate lines | text category quick wins | — |
| Find & replace | with regex toggle | — |
| HTML encode/decode, Unicode, binary/hex/ASCII, Morse | text encoding suite | — |
| Password generator, random string, HMAC generator | crypto suite; HMAC via SubtleCrypto | WebCrypto |
| MD5 (hash-generator lacks it) | SubtleCrypto has no MD5 | `spark-md5` |
| HTTP status / MIME lookup / User-Agent parser | static data tools | `ua-parser-js` |
| QR reader | decode from image | `jsqr` |
| Wi-Fi / vCard / Email / SMS QR | presets over existing generator | `qrcode` (existing) |
| Timezone converter, date difference, age calc, business days | datetime quick wins | `Intl` + `date-fns` |
| Base converter, percentage, VAT, compound interest, loan, GCD/LCM, prime, factorial, Roman numerals | math quick wins | — |
| Lorem ipsum, username, fake JSON/CSV/SQL mock data | generators | `@faker-js/faker` |
| Color palette generator, random color, Tailwind nearest-class | colors quick wins | `culori` + Tailwind palette data |
| CSS gradient/shadow/border-radius generators | pure UI tools | — |
| UTM builder | pure UI | — |
| Barcode (EAN/UPC/Code 128), Data Matrix | barcode suite | `jsbarcode`, `bwip-js` |

### 6.1 Tier A — Flagship features (build the UX, route to existing tools)

These are the differentiators from the roadmap — they don't add new "tools" so much as a new interaction layer over the catalog.

**A1. Universal Converter (`/convert`)**
- [ ] Upload → detect format (use `detectMimeType` in `lib/file-security.ts` + extension map) → show applicable output targets → advanced options → convert → download
- [ ] Implementation: a mapping table `inputType → [available tool slugs + output format]`; deep-link to existing tools with `?file=blob` handoff (object URL via sessionStorage) OR run the shared processors inline (image `convertImage`, pdf-lib ops)
- [ ] Rollout: images + PDFs first (all processors exist); expand as Tier B/C/D tools land

**A2. File Inspector (`/inspect`)**
- [ ] Upload → rich info card (name, type, MIME, extension, size, dimensions via `createImageBitmap`, duration via `<video>`/`<audio>` metadata probe, checksum hashes, creation/mod dates via `file.lastModified`)
- [ ] "Available tools" action row based on detected type (→ Compress, Resize, Convert to WebP, Remove EXIF, Crop…) linking to tools with file handoff
- [ ] `exifr` for full image metadata (EXIF/GPS), already-requested EXIF viewer/remover becomes a sub-feature
- [ ] Libraries: `exifr` (EXIF), existing `detectMimeType`

**A3. Image before/after compare (draggable slider)**
- [ ] Component: two layered images + clip-path slider; used by compress/filters tools as a result preview
- [ ] New tool "Image comparison" + embedded in image tools' result panels

### 6.2 Tier B — Developer & text expansion (cheap, SEO-heavy, all client-side)

Formatters (one generic engine, per-language plugins):
- [ ] SQL formatter, CSS formatter, JS formatter, Markdown formatter, HTML formatter
  - `prettier/standalone` + plugins (`prettier/plugins/postcss`, `sql` via `prettier-plugin-sql` or dedicated `sql-formatter` — prefer `sql-formatter`, simpler browser build)
  - Existing json/xml/yaml formatters stay on their dedicated parsers

JSON/API suite:
- [ ] JSON diff (visual, side-by-side — `diff` pkg)
- [ ] JSON validator (parse + line/col error)
- [ ] JSONPath tester — `jsonpath-plus`
- [ ] JSON schema validator — `ajv` (paired with existing schema generator)

Security/crypto suite (WebCrypto everywhere; label clearly "runs locally"):
- [ ] HMAC generator, password generator (strength meter), random string, RSA keypair generator (WebCrypto generateKey + export PEM)
- [ ] Note: RSA private key display is fine locally; never add server-side key storage

Regex suite:
- [ ] Regex tester (live match highlighting, named groups, flags) — pure `RegExp`
- [ ] Regex explainer (token-by-token breakdown — hand-rolled parser, no lib needed for core tokens)
- [ ] Regex escape/unescape

Git/network (static-data only; live lookups ⛔ server):
- [ ] Gitignore generator (template library + checkboxes) — data + UI
- [ ] Commit message generator — templates + UI
- [ ] Git diff viewer — reuse `diff` on pasted text
- [ ] CIDR/subnet calculator, IPv4/IPv6 converter — pure math
- [ ] ⛔ DNS record lookup, IP lookup — need server; defer to an explicitly-marked "online tools" section someday, or skip

### 6.3 Tier C — Image suite expansion

Conversion gaps:
- [ ] AVIF conversion (encode: `canvas.toBlob('image/avif')` — Chrome/Edge yes, Safari partial; feature-detect and warn)
- [ ] HEIC → JPG — `heic2any`
- [ ] SVG → PNG / JPG — render via `<img>`+canvas (CSP-safe inline SVG)
- [ ] GIF → video: encode frames → `MediaRecorder`/webm, or `gifuct-js` to decode GIF + canvas → WebM. Feasible, medium effort
- [ ] TIFF/BMP → JPG/PNG — `utif` (TIFF decode), BMP is trivial header parse + canvas

Editing (all canvas):
- [ ] Crop, watermark, add text, round corners, border generator, image splitter (grid slices), image merger (canvas stacking), collage maker (drag positions, canvas compose)
- [ ] Sharpen/blur/grayscale individual tools (image-filters already covers some — split or add presets)

Specialized:
- [ ] Color palette extractor + dominant color — median-cut quantization (hand-roll ~80 lines, or `colorthief`-style; `culori` for conversions)
- [ ] Image → ASCII — canvas pixel sampling
- [ ] EXIF viewer + EXIF remover (strip by canvas re-encode) — `exifr`
- [ ] App icon / PWA icon generator (multi-size export as zip — extends existing favicon-generator) — `jszip` (existing)
- [ ] OG image generator + Twitter/X card generator — extends social-image-optimizer (canvas + text layout)
- [ ] "Optimize image for…" (Website/Instagram/LinkedIn/WhatsApp/Email/WordPress/E-commerce) — preset size/quality table over existing compress+resize (pure config + UI)

⛔ Remove background: feasible client-side via `@imgly/background-removal` but the ONNX model download is ~30-80MB. Decision: build with a clear one-time "download 40MB model" consent notice, or defer. Recommend defer to Tier F.

### 6.4 Tier D — PDF expansion

Client-side (pdf-lib / pdfjs-dist, both installed):
- [ ] Delete pages, reorder pages, extract pages (pdf-lib — trivial once page APIs exist; rotate-pdf already shows the pattern)
- [ ] Images → PDF (Tier 0 gap)
- [ ] PDF → text (pdfjs-dist `getTextContent`)
- [ ] PDF → Markdown/HTML (text extraction + light structure inference — pdfjs text items with positions)
- [ ] Add page numbers, headers/footers (pdf-lib + standard fonts)
- [ ] Add text/watermark to PDF (pdf-lib)
- [ ] Encrypt/decrypt PDF (pdf-lib doesn't support encryption — `pdf-lib` fork `@cantoo/pdf-lib` adds it; evaluate)
- [ ] Remove metadata (pdf-lib rewrite without metadata)
- [ ] Add signature / annotate / draw / fill forms / redact — heavier; pdf-lib annotation APIs exist but form-filling needs `pdf-lib` + widget APIs. Sequence after basics. ⚠️ Redact must truly remove content (content-stream surgery), not just draw boxes — hard; do it properly or not at all

⛔ PDF → Word, Word/Excel/PowerPoint → PDF (faithful layout): no quality client-side path. Skip or much later.

### 6.5 Tier E — Data & documents

- [ ] Excel (XLSX/XLS) → CSV, CSV → Excel — `xlsx` (SheetJS community build)
- [ ] CSV cleaner (trim cells, dedupe rows, fix quoting), CSV splitter, CSV merger, TSV → CSV, duplicate row remover, column transformer, dataset sampler — `papaparse` (install usage, currently unused!) — all one shared table-tool foundation
- [ ] SQL formatter (Tier B), SQL → CSV (basic INSERT parser), fake datasets (faker)
- [ ] Word/document: DOCX → HTML / Markdown / TXT — `mammoth` (browser build); DOCX → PDF ⛔ quality issue, skip initially
- [ ] Markdown → PDF, HTML → PDF, TXT → PDF — print-quality path: render then `window.print()` (UX: "Save as PDF" dialog) or `pdf-lib` typesetting (basic). Start with print-to-PDF (zero deps, honest about browser dialog)
- [ ] RTF/ODT/EPUB/MOBI conversions — `epubjs` for EPUB reading; EPUB → TXT/HTML (it's a zip of XHTML — `jszip` + DOMParser); MOBI ⛔; sequence last, niche

### 6.6 Tier F — QR / barcode, heavy media, AI (deferred)

- [ ] QR reading + QR preset types (Wi-Fi/vCard/URL/Email/SMS/Bitcoin) — `jsqr` + `qrcode` (see 6.0, can pull earlier)
- [ ] Barcode suite — `jsbarcode`/`bwip-js` (see 6.0)
- [ ] Compress video / audio, GIF→video encoding, video trimming — `ffmpeg.wasm`: fully client-side but ~25MB+ wasm download with a consent/progress notice. Build behind a "heavy tools" loading pattern (streamed, cached by browser). High demand; do after core catalog
- [ ] Remove background — `@imgly/background-removal`, same heavy-model notice pattern
- [ ] OCR (image→text, PDF→text OCR, table extraction, screenshot→text) — `tesseract.js` (~15MB, lazy-loaded worker; wasm on CDN or self-hosted in `public/`)
- [ ] AI utilities (summarize, "ask this file", alt text, transcripts) ⛔ require model APIs = server or BYO-key. If pursued: explicit "Online tool" badge breaking the local-only pattern; recommend much later

### 6.7 Tier G — Color & design

- [ ] Color picker, palette generator (harmonies + random), gradient generator, WCAG checker (extends contrast-checker), color blindness simulator (`color-blind` lib), random color, image color extractor (Tier C), Tailwind nearest-class converter (nearest-color math over Tailwind palette)
- [ ] Library: `culori` as the single color engine (conversions, harmonies, contrast) — replaces hand-rolled math in color-converter

### 6.8 Tier H — Date & time, math

- [ ] Timezone converter (Intl), ISO 8601 converter, date difference, date calculator, age calculator, business days, cron generator (visual builder — pairs with existing cron explainer), timestamp generator (extends timestamp-converter)
- [ ] Math: the full 6.0 list (base converter, percentage, VAT, compound interest, loan, random number, prime, factorial, GCD/LCM, Roman, scientific calculator)
- [ ] Libraries: `date-fns` (tree-shaken) for date math; calculators are hand-rolled (trivial, better without deps)
- [ ] ⛔ Currency converter — needs live rates API (server or explicit online tool). Skip for now

### 6.9 Unit conversion expansion (existing tool)

- [ ] Add: pressure, energy, power, time, frequency; network units (Mbps/MB/s/Gbps) to data category; complete weight (stone), length (nautical mile), area/volume entries
- [ ] Add `bit` base unit to data (current map is byte-based)
- [ ] Quick-select buttons for common pairs (km↔mi, °C↔°F, MB↔GB)

### Feature-phase sequencing

1. **6.0 gaps** (immediately after Phase 5 — days of work, maximum ROI)
2. **6.2 developer/text** + **6.8 date/math** (cheap wins, big SEO surface)
3. **6.1 flagships** (Universal Converter + File Inspector — as 6.0 fills target density)
4. **6.3 images** + **6.4 PDF**
5. **6.5 data/documents** + **6.7 colors**
6. **6.6 deferred/heavy** (ffmpeg.wasm, OCR, background removal) — last, with heavy-asset consent pattern

---

## New tool checklist

Every tool, no exceptions:

- [ ] 1. Definition in `src/tools/definitions.ts` — all fields (`id` unique, `slug`, `options`, `keywords`, `relatedToolSlugs`, `faq`, `howItWorks`, `available: true`). No duplicate slug/id (guard from 1.1 catches it).
- [ ] 2. Component at `src/tools/<category>/<slug>.tsx` exporting `<Name>Tool`, accepting `ToolComponentProps`.
- [ ] 3. `"use client"` directive at the top.
- [ ] 4. Register in `src/components/tool-loader.tsx` (`TOOL_COMPONENTS` + dynamic import + `loading`).
- [ ] 5. Use the Phase 4.1 form primitives — never raw buttons/colors.
- [ ] 6. File-based tools: use `ToolRunner` + shared processors (image tools via `src/tools/image/shared.ts`).
- [ ] 7. Heavy libs (`ffmpeg.wasm`, `tesseract.js`, `@imgly/*`): dynamic-import inside handler, show download size notice, cache-aware.
- [ ] 8. `pnpm lint` clean.
- [ ] 9. `pnpm dev` verify: page renders, sample input → output → download works, search finds it, `/tools` directory lists it.
- [ ] 10. `pnpm build` (regenerates static params + sitemap).

## Global verification checklist

Run at the end of every phase:

- [ ] `pnpm lint` — zero errors, zero warnings
- [ ] `pnpm build` — succeeds; static params match unique tool count; sitemap contains no 404 URLs (spot-check with `curl` or a link checker)
- [ ] `pnpm dev` spot-check: `/`, `/tools`, `/category/<each>`, `/tools/<sample per category>`
- [ ] Light + dark mode visual pass
- [ ] Keyboard-only navigation pass on new UI
- [ ] No hydration warnings in console
- [ ] Update `AGENTS.md` if conventions changed
