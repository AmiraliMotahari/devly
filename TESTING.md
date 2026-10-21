# Testing

Devly's test suite is layered by *cost and fidelity*: fast deterministic unit
tests for logic, jsdom component tests for shared UI contracts, and real
browser E2E tests for user workflows.

```
Vitest + jsdom            unit + component tests   (fast, deterministic)
        ↓
Playwright (Chromium)     real-user workflows      (production build)
        ↓
Playwright (webkit/firefox) @critical browser-API tests
```

## Commands

```bash
pnpm test                # Vitest unit + component tests (382 tests)
pnpm test:watch          # Vitest in watch mode
pnpm test:coverage       # Vitest with v8 coverage report
pnpm test:e2e            # Playwright: builds prod app, serves :3100, runs all suites
pnpm test:e2e:ui         # Playwright UI mode (debug individual tests)
pnpm test:e2e:dev        # Playwright against the dev server (fast iteration)

# Run one unit test file
pnpm test tests/unit/tools/data/lib.test.ts

# Run one E2E test by name (substring match)
pnpm test:e2e -- -g "converts JSON to YAML"

# Run only the cross-browser critical matrix
pnpm test:e2e -- --project=webkit --project=firefox

# Debug a failure with the trace viewer
pnpm exec playwright show-trace test-results/<test-dir>/trace.zip
```

## Layout

- `tests/unit/**/*.test.ts(x)` — unit & component tests, mirroring `src/` structure
- `tests/e2e/*.spec.ts` — Playwright suites
  - `app-shell` — home, navigation, palette, theme, responsive, routing
  - `all-tools` — registry-driven: every tool's page contract (86 tools)
  - `converters` — bidirectional data converters, known crypto vectors
  - `crypto-text` — encryption round-trips, generators, diff
  - `file-tools` — image/PDF/ZIP real-file processing, downloads;
    PNG→WebP / JPG→WebP / WebP→PNG assert real RIFF/WEBP magic bytes
    (@critical: WebKit is Safari's engine and has no native WebP encoder)
  - `generators-download` — robots/sitemap/meta output validity, clipboard, reset
  - `image-editor` — Advanced Image Editor: import, adjust, text, border,
    undo/redo, export (PNG magic bytes), merge (order controls,
    open-in-editor), split (custom guides + overlay), collage (slot swap),
    bg removal, pixel asserts (filter delta / corner-radius alpha /
    border edge), crop aspect lock, re-import dedupe, pan smoke,
    text-only design entry
- `tests/e2e/helpers.ts` — shared fixtures: `navigateToTool`, `fillInput`, `runTool`,
  `getOutputText`, `uploadFile`, `downloadOutput`, `trackPageErrors`
- `tests/fixtures/` — deterministic inputs (sample.json/xml/csv/yaml/toml,
  valid pixel images, solid.png for pixel asserts, wide.png 1200×800 for
  overflow/pan interactions, minimal PDF)
- `tests/setup/vitest-setup.ts` — jsdom polyfills (WebCrypto, DataTransfer)
  — must stay **synchronous**: a top-level `await` makes Vitest skip
  everything after it, so the polyfills would never install
- `tests/setup/jest-dom-matchers.d.ts` — jest-dom matcher types for Vitest 5

## Conventions

- **Behavior over implementation**: assert what a user sees (output, errors,
  downloads), never internal state.
- **Hydration race**: tool pages hydrate after first paint. `navigateToTool`
  waits for interactive chrome; `fillInput` verifies the primary action
  enabled and retries once if the fill landed pre-hydration.
- **Error scoping**: tool errors are `[data-slot="alert"]` — sonner's toast
  region also uses `role="alert"` and must not be matched.
- **Primary vs mode buttons**: tools with mode switches render small
  (`data-size="sm"`) buttons with the same text as the primary action;
  `runTool` targets the full-size button.
- **Output extraction**: `getOutputText` reads only the Shiki `<pre>` (not
  the CodeBlock header) or a readonly textarea fallback.
- **Cross-browser**: clipboard *reading* is Chromium-only (permission grant);
  other browsers verify copy via the success toast. Tests needing Safari /
  Firefox fidelity are tagged `@critical`.
- **Known vectors**: hash tests use FIPS 180 vectors; Base64 uses RFC 4648.
- **Output bytes over output labels**: a produced file is checked by its
  magic bytes, not its extension — browsers can silently encode a
  different format than requested (Safari encodes PNG for WebP).

## Coverage philosophy

Percentage is tracked (`pnpm test:coverage`) but not chased. Shared logic
(data lib, search, file security, crypto, language resolution) is ~100%
covered by unit tests; shared UI by component tests; every tool by an E2E
contract. E2E asserts semantic correctness (re-parse XML/JSON, verify file
magic bytes, known digest vectors) rather than visibility only.

## What the suite has caught

- `json-to-xml` returning empty string for all inputs (xml-js misuse)
- CSV quoted-field parsing corruption + crash on numeric cells
- React #418 hydration mismatch on timestamp-converter (Date.now() at render)
- Latent hydration mismatch in sitemap-generator (timezone-dependent today)
- Dangling `relatedToolSlugs` reference (robots → "sitemap")
- Hardcoded UploadZone `aria-label` ignoring custom labels
