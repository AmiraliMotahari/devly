"use client";

import { useCallback, useEffect, useState } from "react";
import { appName } from "@/lib/constants";

const RECENT_KEY = `${appName}-recent-tools`;
const FAVORITE_KEY = `${appName}-favorites`;
const MAX_RECENT = 20;

const CHANGE_EVENT = `${appName}-tool-history-change`;

function readSlugs(key: string): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is string => typeof s === "string");
  } catch {
    return [];
  }
}

function writeSlugs(key: string, slugs: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(slugs));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    // localStorage unavailable (private mode, quota) — ignore
  }
}

export function recordToolVisit(slug: string): void {
  const recent = readSlugs(RECENT_KEY).filter((s) => s !== slug);
  recent.unshift(slug);
  writeSlugs(RECENT_KEY, recent.slice(0, MAX_RECENT));
}

export function toggleFavorite(slug: string): void {
  const favorites = readSlugs(FAVORITE_KEY);
  const next = favorites.includes(slug)
    ? favorites.filter((s) => s !== slug)
    : [slug, ...favorites];
  writeSlugs(FAVORITE_KEY, next);
}

export function isFavorite(slug: string): boolean {
  return readSlugs(FAVORITE_KEY).includes(slug);
}

/**
 * Re-renders when history changes (own updates included).
 * Reads localStorage only in an effect — the first render always
 * matches the server, avoiding hydration mismatches.
 */
export function useToolHistory() {
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => {
      setRecentSlugs(readSlugs(RECENT_KEY));
      setFavoriteSlugs(readSlugs(FAVORITE_KEY));
    };
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, []);

  const handleToggleFavorite = useCallback((slug: string) => {
    toggleFavorite(slug);
  }, []);

  return {
    recentSlugs,
    favoriteSlugs,
    toggleFavorite: handleToggleFavorite,
  };
}

/**
 * Records a tool page visit once on mount.
 */
export function ToolVisitRecorder({ slug }: { slug: string }) {
  useEffect(() => {
    recordToolVisit(slug);
  }, [slug]);
  return null;
}
