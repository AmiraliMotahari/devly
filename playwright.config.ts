import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3100);
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // Tool pages load heavy client libs (pdf.js, Shiki, culori); parallel
  // workers contend for CPU with the Next.js server. 2 workers keeps the
  // suite stable on dev laptops and CI runners without excessive runtime.
  workers: isCI ? 2 : 2,
  timeout: 60_000,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  expect: {
    timeout: 10_000,
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // clipboard-read/write are Chromium-only context permissions.
        contextOptions: {
          permissions: ["clipboard-read", "clipboard-write"],
        },
      },
    },
    {
      // Cross-browser compatibility for browser-API-sensitive workflows
      // (clipboard, downloads, file upload, Web Crypto). Only tests tagged
      // @critical run here, keeping the matrix cheap.
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      grep: /@critical/,
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
      grep: /@critical/,
    },
  ],

  webServer: process.env.NO_WEB_SERVER
    ? undefined
    : {
        command:
          process.env.E2E_USE_DEV === "1"
            ? `pnpm next dev -p ${PORT}`
            : `pnpm next build && pnpm next start -p ${PORT}`,
        // The instant() navigation lock only exists in production builds
        // made with EXPOSE_TESTING_API=1 (see instant-nav.rig.md). Always
        // inject it so tests/e2e/instant-nav.spec.ts works from `pnpm
        // test:e2e` without manual env setup. It gates a testing API only,
        // never deployed codepaths.
        env: {
          EXPOSE_TESTING_API: "1",
          ...process.env,
        },
        url: BASE_URL,
        reuseExistingServer: !isCI,
        timeout: 420_000,
        stdout: "ignore",
        stderr: "pipe",
      },
});
