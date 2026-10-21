import { describe, expect, it } from "vitest";
import {
  toRateMap,
  rateFor,
  convert,
  formatAmount,
  activeCurrencies,
  todayISO,
  type Rate,
} from "@/tools/converters/currency";

const RATES: Rate[] = [
  { date: "2026-10-21", base: "USD", quote: "EUR", rate: 0.89075 },
  { date: "2026-10-21", base: "USD", quote: "JPY", rate: 158.27 },
];

describe("toRateMap", () => {
  it("indexes rates by quote", () => {
    const map = toRateMap(RATES);
    expect(map.get("EUR")).toBe(0.89075);
    expect(map.get("JPY")).toBe(158.27);
    expect(map.size).toBe(2);
  });
});

describe("rateFor", () => {
  const map = toRateMap(RATES);

  it("returns the direct rate", () => {
    expect(rateFor(map, "USD", "EUR")).toBe(0.89075);
  });

  it("is 1 for the base itself", () => {
    expect(rateFor(map, "USD", "USD")).toBe(1);
  });

  it("is null for an unknown quote", () => {
    expect(rateFor(map, "USD", "XYZ")).toBeNull();
  });

  it("is null when the map is empty", () => {
    expect(rateFor(new Map(), "USD", "EUR")).toBeNull();
  });
});

describe("convert", () => {
  it("multiplies amount by rate", () => {
    expect(convert(100, 0.89075)).toBeCloseTo(89.075, 6);
    expect(convert(100, 158.27)).toBeCloseTo(15827, 6);
  });

  it("handles zero and fractional amounts", () => {
    expect(convert(0, 0.89)).toBe(0);
    expect(convert(2.5, 4)).toBe(10);
  });
});

describe("activeCurrencies", () => {
  const list = [
    { iso_code: "USD", name: "US Dollar", symbol: "$", end_date: "2026-10-21" },
    { iso_code: "TTD", name: "Trinidad Dollar", end_date: "2018-04-01" },
    { iso_code: "EUR", name: "Euro", symbol: "€" },
  ];

  it("drops delisted currencies and sorts by code", () => {
    const result = activeCurrencies(list, "2026-10-21");
    expect(result.map((c) => c.code)).toEqual(["EUR", "USD"]);
  });

  it("keeps a currency whose end_date is today", () => {
    expect(activeCurrencies(list, "2026-10-21").map((c) => c.code)).toContain("USD");
  });

  it("keeps currencies without an end_date", () => {
    expect(activeCurrencies(list, "2026-10-21").map((c) => c.code)).toContain("EUR");
  });
});

describe("todayISO", () => {
  it("is a YYYY-MM-DD date", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("formatAmount", () => {
  it("groups thousands and trims to 2 decimals", () => {
    expect(formatAmount(1234567.891)).toBe("1,234,567.89");
    expect(formatAmount(89.075)).toBe("89.08");
    expect(formatAmount(42)).toBe("42");
  });

  it("supports a higher precision for rates", () => {
    expect(formatAmount(0.89075, 4)).toBe("0.8908");
  });

  it("returns a dash for non-finite values", () => {
    expect(formatAmount(NaN)).toBe("—");
    expect(formatAmount(Infinity)).toBe("—");
  });
});
