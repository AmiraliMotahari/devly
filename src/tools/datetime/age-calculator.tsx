"use client";

import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";
import {
  ToolActions,
  ToolContainer,
  ToolField,
} from "@/components/tool-forms";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export function AgeCalculator({}: ToolComponentProps) {
  const [birthdate, setBirthdate] = useState("");
  const [age, setAge] = useState<{
    years: number;
    months: number;
    days: number;
    totalDays: number;
    nextBirthdayIn: number;
    dayOfWeek: string;
  } | null>(null);
  const [error, setError] = useState("");

  const handleCalculate = () => {
    setError("");
    setAge(null);

    if (!birthdate) {
      setError("Please select your birth date");
      return;
    }
    const birth = new Date(birthdate);
    if (isNaN(birth.getTime())) {
      setError("Invalid date");
      return;
    }
    const now = new Date();
    if (birth > now) {
      setError("Birth date cannot be in the future");
      return;
    }

    // Calendar-aware age
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    let days = now.getDate() - birth.getDate();
    if (days < 0) {
      months--;
      const prevMonthDays = new Date(
        now.getFullYear(),
        now.getMonth(),
        0,
      ).getDate();
      days += prevMonthDays;
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    const totalDays = Math.floor(
      (now.getTime() - birth.getTime()) / 86_400_000,
    );

    // Next birthday
    let next = new Date(
      now.getFullYear(),
      birth.getMonth(),
      birth.getDate(),
    );
    if (next < now) {
      next = new Date(
        now.getFullYear() + 1,
        birth.getMonth(),
        birth.getDate(),
      );
    }
    const nextBirthdayIn = Math.ceil(
      (next.getTime() - now.getTime()) / 86_400_000,
    );

    const dayOfWeek = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
    }).format(birth);

    setAge({
      years,
      months,
      days,
      totalDays,
      nextBirthdayIn,
      dayOfWeek,
    });
  };

  return (
    <ToolContainer>
      <ToolField label="Birth date" htmlFor="age-birth">
        <Input
          id="age-birth"
          type="date"
          value={birthdate}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setBirthdate(e.target.value)}
        />
      </ToolField>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <ToolActions
        onRun={handleCalculate}
        onClear={() => {
          setBirthdate("");
          setAge(null);
          setError("");
        }}
        runLabel="Calculate age"
        disabled={!birthdate}
      />

      {age && (
        <ToolField label="Your age">
          <Card>
            <CardContent className="flex flex-col gap-3 p-4">
              <p className="text-3xl font-bold">
                {age.years}{" "}
                <span className="text-lg font-medium text-muted-foreground">
                  years old
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                {age.years} years, {age.months} months, {age.days} days ·{" "}
                {age.totalDays.toLocaleString()} days total
              </p>
              <p className="text-sm text-muted-foreground">
                Born on a {age.dayOfWeek} · next birthday in{" "}
                <span className="font-medium text-foreground">
                  {age.nextBirthdayIn === 0 ? "today! 🎂" : `${age.nextBirthdayIn} days`}
                </span>
              </p>
            </CardContent>
          </Card>
        </ToolField>
      )}
    </ToolContainer>
  );
}
