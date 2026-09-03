# instant-nav rig: devly

- BUILD: `EXPOSE_TESTING_API=1 pnpm next build && pnpm next start -p 3100` (local production build; never `next dev`)
- EXPOSE: `experimental.exposeTestingApiInProductionBuild: process.env.EXPOSE_TESTING_API === "1"` in `next.config.ts` — set the env var at **build** time, not just serve time.
- RUN: `pnpm test:e2e` (Playwright, `./e2e`, port 3100 default via `PORT`/`BASE_URL`). The config's `webServer` runs the build+start itself; for instant() runs use `EXPOSE_TESTING_API=1` in the environment so the webServer inherits it.
- TEST USER: no auth — public tool site. All routes are anonymous.
- DRIFT: none (no accounts/flags/plans). The only environment input is `NEXT_PUBLIC_SITE_URL` via `.env.local`.
- LOOP: local build → start → test on one machine; fully agent-drivable. No pushes or deploys required.
- LIVENESS: n/a — local `build && start`, artifact is freshly built each iteration.
- WALLS:
  - Port 3100 must be free; kill any stale `next start` before a run (`EADDRINUSE`).
  - Tool pages load heavy client libs (pdf.js, Shiki); keep Playwright workers at 2 (config default).
  - `EXPOSE_TESTING_API=1` must be present for **both** the build and the server run; simplest is `EXPOSE_TESTING_API=1 pnpm test:e2e` letting webServer inherit it.
