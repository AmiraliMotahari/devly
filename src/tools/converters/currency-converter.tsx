"use client";

/**
 * Currency Exchange — live rates from the Frankfurter API.
 * The first tool that talks to a network API: it sends currency codes
 * only (no files, no personal data).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CopyToClipboard } from "@/components/copy-to-clipboard";
import type { ToolComponentProps } from "@/tools/tool-props";
import {
  fetchCurrencies,
  fetchRates,
  toRateMap,
  rateFor,
  convert,
  formatAmount,
  type Currency,
} from "./currency";

export function CurrencyConverter({ tool }: ToolComponentProps) {
  void tool;
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [amount, setAmount] = useState("100");
  const [base, setBase] = useState("USD");
  const [quote, setQuote] = useState("EUR");
  /** Rates are stored with the base they belong to, so switching base
   *  shows a loading state until the new table arrives. */
  const [data, setData] = useState<{
    base: string;
    rates: Map<string, number>;
    date: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loading = data?.base !== base;

  // Currency list is static data — fetch it once.
  useEffect(() => {
    const controller = new AbortController();
    fetchCurrencies(controller.signal)
      .then(setCurrencies)
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load the currency list.",
          );
        }
      });
    return () => controller.abort();
  }, []);

  const loadRates = useCallback(
    async (baseCode: string, signal?: AbortSignal) => {
      const list = await fetchRates(baseCode, signal);
      if (signal?.aborted) return;
      setData({
        base: baseCode,
        rates: toRateMap(list),
        date: list[0]?.date ?? null,
      });
      setError(null);
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        await loadRates(base, controller.signal);
      } catch (err) {
        if (controller.signal.aborted) return;
        setData({ base, rates: new Map(), date: null });
        setError(
          err instanceof Error ? err.message : "Could not load exchange rates.",
        );
      }
    })();
    return () => controller.abort();
  }, [base, loadRates]);

  const rate = useMemo(() => {
    const map = data?.base === base ? data.rates : null;
    return map ? rateFor(map, base, quote) : null;
  }, [data, base, quote]);
  const rateDate = data?.base === base ? data.date : null;
  const numericAmount = Number(amount);
  const converted =
    rate !== null && Number.isFinite(numericAmount)
      ? convert(numericAmount, rate)
      : null;

  const resultText =
    converted !== null ? `${formatAmount(converted)} ${quote}` : "—";

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="currency-amount">Amount</Label>
          <Input
            id="currency-amount"
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            data-testid="currency-amount"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="currency-base">From</Label>
          <Select value={base} onValueChange={setBase}>
            <SelectTrigger id="currency-base" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="currency-quote">To</Label>
          <Select value={quote} onValueChange={setQuote}>
            <SelectTrigger id="currency-quote" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="flex items-center justify-between gap-4 p-6">
          <div>
            <p className="text-xs text-muted-foreground">Result</p>
            <p
              className="text-2xl font-bold tabular-nums"
              data-testid="currency-result"
              aria-live="polite"
            >
              {loading && !rate ? (
                <Loader2 className="size-6 animate-spin" />
              ) : (
                `${amount} ${base} = ${resultText}`
              )}
            </p>
            {rate !== null && (
              <p className="mt-1 text-xs text-muted-foreground" data-testid="currency-rate">
                1 {base} = {formatAmount(rate, 4)} {quote}
                {rateDate ? ` · rates for ${rateDate}` : ""}
              </p>
            )}
          </div>
          <CopyToClipboard value={resultText} variant="ghost" size="sm" showLabel />
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Live rates from the Frankfurter API (ECB reference rates). Only
          currency codes are sent — no files, no personal data.
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            void loadRates(base).catch((err) =>
              setError(
                err instanceof Error
                  ? err.message
                  : "Could not load exchange rates.",
              ),
            )
          }
          disabled={loading}
          data-testid="currency-refresh"
        >
          <RefreshCw data-icon="inline-start" />
          Refresh
        </Button>
      </div>
    </div>
  );
}
