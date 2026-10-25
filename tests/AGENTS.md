# tests — Verification Layer

Parent: [`/AGENTS.md`](../AGENTS.md)

## Purpose

Guards every other layer. Two test stacks come together here: Vitest unit/component tests (fast, jsdom) and Playwright end-to-end specs (real browser, production build). Conventions are defined in [`TESTING.md`](TESTING.md) — read it before adding specs.

## Layout

| Path | Contents |
| --- | --- |
| `unit/` | Vitest + React Testing Library specs in `*.test.ts(x)`, **mirroring the `src/` tree**: `unit/components/`, `unit/lib/`, `unit/tools/` |
| `e2e/` | Playwright suit: `all-tools.spec.ts` (registry-driven — covers every registered tool page automatically), plus focused flows: `app-shell`, `instant-nav`, `pwa`, `converters`, `currency`, `crypto-text`, `file-tools`, `image-editor`, `generators-download` |
| `fixtures/` | Deterministic test inputs (tiny pixel images, README sample.txt, minimal PDF) — **reuse these**, do not commit new ad-hoc binaries |
| `setup/` | `vitest-setup.ts` (jsdom config, jest-dom matchers) |

## Rules

- **Suite choice**: logic and component behavior → unit; anything about routing, hydration, downloads, offline/PWA, cross-browser output correctness → E2E. Error-path specs must scope their alerts/assertions to the component under test (error-alert scoping, per TESTING.md).
- **Hydration waits**: E2E specs wait for hydration before asserting; see TESTING.md.
- **Coverage hooks for future work**: when a tool with unique behavior is added, add a workflow test in the relevant suite in addition to the automatic `all-tools.spec.ts` coverage.
- The unit tree mirrors `src/` — `src/tools/image/editor/state.ts` tests live in `tests/unit/tools/image/editor/state.test.ts`, etc.
- Run with `pnpm test` (unit) and `pnpm test:e2e` (E2E); filter E2E with `pnpm test:e2e -- -g "<name>"`; tag spec with `@critical` for cross-browser runs.
- Test boundaries matter in both directions: unit specs for image-editor tests reach into `src/tools/image/editor/state.ts` factories (e.g. `makeImageLayer`) rather than driving the whole editor UI.

## Connects

- Tests: [`src/app/AGENTS.md`](../src/app/AGENTS.md) shells · [`src/components/AGENTS.md`](../src/components/AGENTS.md) primitives · [`src/tools/AGENTS.md`](../src/tools/AGENTS.md) logic
- Utilities under test: [`src/lib/AGENTS.md`](../src/lib/AGENTS.md) (in `tests/unit/lib/`)
- Conventions detail: [`TESTING.md`](TESTING.md)
