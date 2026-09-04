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
pnpm test                # Vitest unit + component tests (203 tests)
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
  - `all-tools` — registry-driven: every tool's page contract (84 tools)
  - `converters` — bidirectional data converters, known crypto vectors
  - `crypto-text` — encryption round-trips, generators, diff
  - `file-tools` — image/PDF/ZIP real-file processing, downloads
  - `generators-download` — robots/sitemap/meta output validity, clipboard, reset
- `tests/e2e/helpers.ts` — shared fixtures: `navigateToTool`, `fillInput`, `runTool`,
  `getOutputText`, `uploadFile`, `downloadOutput`, `trackPageErrors`
- `tests/fixtures/` — deterministic inputs (sample.json/xml/csv/yaml/toml,
  valid pixel images, minimal PDF)
- `tests/setup/vitest-setup.ts` — jsdom polyfills (WebCrypto, DataTransfer)

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
