/**
 * Currency exchange via the Frankfurter API (https://frankfurter.dev).
 *
 * Public, key-free, CORS-enabled. Only currency codes are sent — the tool
 * takes no files, so nothing local leaves the browser.
 */

const API = "https://api.frankfurter.dev/v2";

export type Currency = {
  code: string;
  name: string;
  symbol?: string;
};

export type Rate = {
  date: string;
  base: string;
  quote: string;
  rate: number;
};

/** Today as YYYY-MM-DD (local time — the API's end_date is a plain date). */
export function todayISO(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${mm}-${dd}`;
}

type RawCurrency = {
  iso_code: string;
  name: string;
  symbol?: string;
  end_date?: string;
};

/**
 * Keep only currencies that are still in circulation — the API also
 * lists delisted ones (TTD, VUV, …) which have no current rates.
 * Pure — unit-tested.
 */
export function activeCurrencies(
  list: RawCurrency[],
  today = todayISO(),
): Currency[] {
  return list
    .filter((c) => !c.end_date || c.end_date >= today)
    .map((c) => ({ code: c.iso_code, name: c.name, symbol: c.symbol }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

/** Currencies Frankfurter serves (name + symbol per ISO code). */
export async function fetchCurrencies(signal?: AbortSignal): Promise<Currency[]> {
  const res = await fetch(`${API}/currencies`, { signal });
  if (!res.ok) throw new Error(`Currency list request failed (${res.status}).`);
  const data = (await res.json()) as RawCurrency[];
  return activeCurrencies(data);
}

/** All latest rates for a base currency, in one request. */
export async function fetchRates(
  base: string,
  signal?: AbortSignal,
): Promise<Rate[]> {
  const res = await fetch(`${API}/rates?base=${encodeURIComponent(base)}`, {
    signal,
  });
  if (!res.ok) throw new Error(`Exchange rates request failed (${res.status}).`);
  const data = (await res.json()) as Rate[];
  return Array.isArray(data) ? data : [];
}

/** Rate map for a base: quote → rate. */
export function toRateMap(rates: Rate[]): Map<string, number> {
  return new Map(rates.map((r) => [r.quote, r.rate]));
}

/**
 * Rate for one quote, expressed as "1 base = X quote". The API returns
 * base→quote directly; when the quote is the base itself the rate is 1.
 */
export function rateFor(
  rateMap: Map<string, number>,
  base: string,
  quote: string,
): number | null {
  if (base === quote) return 1;
  const rate = rateMap.get(quote);
  return typeof rate === "number" && Number.isFinite(rate) ? rate : null;
}

/** Convert an amount using a base→quote rate. */
export function convert(amount: number, rate: number): number {
  return amount * rate;
}

/** Format an amount with thousands separators and up to 2 decimals. */
export function formatAmount(value: number, maxDecimals = 2): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
}
