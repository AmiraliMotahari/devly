"use client";

import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";
import {
  ToolActions,
  ToolContainer,
  ToolField,
  ToolRow,
  ToolSelect,
} from "@/components/tool-forms";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

const COMMON_ZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Africa/Cairo",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
  "Pacific/Auckland",
];

// Stable list of zones actually supported by this runtime
const SUPPORTED = Intl.supportedValuesOf("timeZone");

const ZONE_OPTIONS = SUPPORTED.map((z) => ({ label: z, value: z }));

export function TimezoneConverter({}: ToolComponentProps) {
  const [datetime, setDatetime] = useState(() => {
    // default: now, in local datetime-local format
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [fromZone, setFromZone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [result, setResult] = useState<{ zone: string; time: string }[] | null>(
    null,
  );

  const handleConvert = () => {
    // datetime-local gives "YYYY-MM-DDTHH:mm" in the *from* zone.
    // Compute the UTC instant, then render in each common zone.
    const local = new Date(datetime);
    if (isNaN(local.getTime())) return;

    // Correct for the offset between the user's zone and the chosen from-zone
    const fromOffsetMin = zoneOffsetMinutes(fromZone, local);
    const userOffsetMin = local.getTimezoneOffset();
    const utc = new Date(local.getTime() + (userOffsetMin + fromOffsetMin) * 60_000);

    const rows = COMMON_ZONES.map((zone) => ({
      zone,
      time: new Intl.DateTimeFormat("en-GB", {
        timeZone: zone,
        dateStyle: "medium",
        timeStyle: "short",
      }).format(utc),
    }));
    setResult(rows);
  };

  // Offset of a zone at a given instant, in minutes east of UTC
  function zoneOffsetMinutes(zone: string, at: Date): number {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const parts = dtf.formatToParts(at);
    const get = (t: string) =>
      Number(parts.find((p) => p.type === t)?.value ?? "0");
    const asUtc = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour") % 24,
      get("minute"),
      get("second"),
    );
    return Math.round((asUtc - at.getTime()) / 60_000);
  }

  return (
    <ToolContainer>
      <ToolRow>
        <div className="flex flex-col gap-2">
          <label htmlFor="tz-datetime" className="text-sm font-medium">
            Date &amp; time (in &quot;from&quot; zone)
          </label>
          <Input
            id="tz-datetime"
            type="datetime-local"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
          />
        </div>
      </ToolRow>

      <ToolRow>
        <ToolSelect
          label="From zone"
          value={fromZone}
          onValueChange={setFromZone}
          options={ZONE_OPTIONS}
        />
      </ToolRow>

      <ToolActions
        onRun={handleConvert}
        runLabel="Convert"
        disabled={!datetime}
      />

      {result && (
        <ToolField label="Converted times">
          <div className="grid gap-2 sm:grid-cols-2">
            {result.map((r) => (
              <Card key={r.zone}>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">{r.zone}</p>
                  <p className="font-mono text-sm">{r.time}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </ToolField>
      )}
    </ToolContainer>
  );
}
