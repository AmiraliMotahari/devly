import { expect, test } from "@playwright/test";
import { navigateToTool, trackPageErrors } from "./helpers";

/**
 * Currency Converter — the only tool that calls a network API.
 * The API is mocked so the test is deterministic and works offline.
 */
const CURRENCIES = [
  { iso_code: "EUR", name: "Euro", symbol: "€" },
  { iso_code: "GBP", name: "British Pound", symbol: "£" },
  { iso_code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { iso_code: "USD", name: "US Dollar", symbol: "$" },
];

const RATES = [
  { date: "2026-10-21", base: "USD", quote: "EUR", rate: 0.89075 },
  { date: "2026-10-21", base: "USD", quote: "GBP", rate: 0.74949 },
  { date: "2026-10-21", base: "USD", quote: "JPY", rate: 158.27 },
];

async function mockFrankfurter(page: import("@playwright/test").Page) {
  await page.route("**/api.frankfurter.dev/v2/currencies", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(CURRENCIES),
    }),
  );
  await page.route("**/api.frankfurter.dev/v2/rates**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(RATES),
    }),
  );
}

test.describe("Currency Converter (Frankfurter API)", () => {
  test("converts an amount using the fetched rate", async ({ page }) => {
    const errors = trackPageErrors(page);
    await mockFrankfurter(page);
    await navigateToTool(page, "currency-converter");

    // Defaults: 100 USD → EUR
    await expect(page.getByTestId("currency-result")).toContainText(
      "100 USD = 89.08 EUR",
      { timeout: 15_000 },
    );
    // The rate and its date are shown, not just the number.
    await expect(page.getByTestId("currency-rate")).toContainText(
      "1 USD = 0.8908 EUR",
    );
    await expect(page.getByTestId("currency-rate")).toContainText("2026-10-21");
    await errors.assertNone("currency-converter");
  });

  test("changing the amount recalculates without another request", async ({
    page,
  }) => {
    const errors = trackPageErrors(page);
    let rateRequests = 0;
    await page.route("**/api.frankfurter.dev/v2/rates**", (route) => {
      rateRequests++;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(RATES),
      });
    });
    await mockFrankfurter(page);
    await navigateToTool(page, "currency-converter");
    await expect(page.getByTestId("currency-result")).toContainText("89.08 EUR", {
      timeout: 15_000,
    });
    const requestsAfterLoad = rateRequests;

    await page.getByTestId("currency-amount").fill("250");
    await expect(page.getByTestId("currency-result")).toContainText(
      "250 USD = 222.69 EUR",
    );
    // The rate table is cached — switching the amount is pure local math.
    expect(rateRequests).toBe(requestsAfterLoad);
    await errors.assertNone("currency-converter amount");
  });

  test("surfaces an API failure instead of a wrong number", async ({ page }) => {
    const errors = trackPageErrors(page);
    await page.route("**/api.frankfurter.dev/v2/currencies", (route) =>
      route.fulfill({ status: 500, body: "boom" }),
    );
    await page.route("**/api.frankfurter.dev/v2/rates**", (route) =>
      route.fulfill({ status: 500, body: "boom" }),
    );
    await navigateToTool(page, "currency-converter");

    await expect(page.locator("[data-slot='alert']")).toContainText(
      /failed/i,
      { timeout: 15_000 },
    );
    await errors.assertNone("currency-converter failure");
  });

  test("queues the request while offline and completes it when back online", async ({
    page,
  }) => {
    // The rates request fails the way it does with no connection.
    await page.route("**/api.frankfurter.dev/v2/rates**", (route) =>
      route.abort("internetdisconnected"),
    );
    await page.route("**/api.frankfurter.dev/v2/currencies", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(CURRENCIES),
      }),
    );
    await navigateToTool(page, "currency-converter");

    // Offline is not a failure — the request is queued.
    await expect(page.getByTestId("currency-offline-queue")).toBeVisible({
      timeout: 15_000,
    });

    // Back online: the queued request runs and the result appears.
    await page.unroute("**/api.frankfurter.dev/v2/rates**");
    await page.route("**/api.frankfurter.dev/v2/rates**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(RATES),
      }),
    );
    await page.evaluate(() => window.dispatchEvent(new Event("online")));

    await expect(page.getByTestId("currency-result")).toContainText(
      "89.08 EUR",
      { timeout: 15_000 },
    );
    await expect(page.getByTestId("currency-offline-queue")).toBeHidden();
  });
});
