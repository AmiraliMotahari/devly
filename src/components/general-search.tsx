"use client";

import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from "@/components/ui/combobox";
import { appName } from "@/lib/constants";
import { CATEGORY_META, toolDefinitions } from "@/tools";
import { SearchResult, searchTools } from "@/tools/search";
import { ToolDefinition } from "@/types/tool";
import { Shield, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const RECENT_KEY = `${appName}-recent-tools`;
const FAVORITE_KEY = `${appName}-favorites`;

function getRecentSlugs(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function getFavoriteSlugs(): string[] {
  try {
    return JSON.parse(localStorage.getItem(FAVORITE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

type ComboboxValue = {
  source: "tools" | "category";
  target: string;
};

export function GeneralSearch({}: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const results = query ? searchTools(query, 8) : [];
  const recent = getRecentSlugs()
    .map((slug) => toolDefinitions.find((t) => t.slug === slug))
    .filter((t): t is NonNullable<typeof t> => t !== undefined)
    .slice(0, 5);
  const favorites = getFavoriteSlugs()
    .map((slug) => toolDefinitions.find((t) => t.slug === slug))
    .filter((t): t is NonNullable<typeof t> => t !== undefined)
    .slice(0, 5);

  const navigate = (path: string) => {
    setQuery("");
    router.push(path);
  };

  return (
    <Combobox
      onValueChange={(v: ComboboxValue | null) => {
        if (!v) return;
        navigate(`/${v.source}/${v.target}`);
      }}
    >
      <ComboboxInput
        value={query}
        placeholder="Search for a tool... (e.g. compress image, merge pdf, json)"
        onChange={(e) => setQuery(e.target.value)}
        className={"mx-auto mt-8 max-w-xl h-12"}
        showTrigger={false}
      />
      <ComboboxContent>
        {query && !results?.length ? (
          <ComboboxEmpty>No tools found.</ComboboxEmpty>
        ) : null}

        <ComboboxList>
          {!query && favorites.length ? (
            <ComboboxGroup items={favorites}>
              <ComboboxLabel>Favorites</ComboboxLabel>
              <ComboboxCollection>
                {(item) => {
                  const t = item as ToolDefinition;
                  return (
                    <ComboboxItem
                      key={"fav-" + t.id}
                      value={
                        {
                          source: "tools",
                          target: t.slug,
                        } satisfies ComboboxValue
                      }
                    >
                      <Star className="mr-2 h-4 w-4 text-amber-500" />
                      {t.name}
                    </ComboboxItem>
                  );
                }}
              </ComboboxCollection>
            </ComboboxGroup>
          ) : null}
          {!query && recent.length ? (
            <ComboboxGroup items={recent}>
              <ComboboxLabel>Recent</ComboboxLabel>
              <ComboboxCollection>
                {(item) => {
                  const t = item as ToolDefinition;
                  return (
                    <ComboboxItem
                      key={`recent-${t.id}`}
                      value={
                        {
                          source: "tools",
                          target: t.slug,
                        } satisfies ComboboxValue
                      }
                    >
                      <Star className="mr-2 h-4 w-4 text-amber-500" />
                      {t.name}
                    </ComboboxItem>
                  );
                }}
              </ComboboxCollection>
            </ComboboxGroup>
          ) : null}
          {!query && Object.keys(CATEGORY_META).length ? (
            <ComboboxGroup items={Object.keys(CATEGORY_META)}>
              <ComboboxLabel>Categories</ComboboxLabel>
              <ComboboxCollection>
                {(item) => {
                  const c = item as keyof typeof CATEGORY_META;
                  return (
                    <ComboboxItem
                      key={`cat-${c}`}
                      value={
                        {
                          source: "category",
                          target: c,
                        } satisfies ComboboxValue
                      }
                    >
                      <Star className="mr-2 h-4 w-4 text-amber-500" />
                      {CATEGORY_META[c].label}
                    </ComboboxItem>
                  );
                }}
              </ComboboxCollection>
            </ComboboxGroup>
          ) : null}
          {query && results.length ? (
            <ComboboxGroup items={results}>
              <ComboboxLabel>Tools</ComboboxLabel>
              <ComboboxCollection>
                {(item) => {
                  const t = item as SearchResult;
                  return (
                    <ComboboxItem
                      key={`tools-${t.tool.id}`}
                      value={
                        {
                          source: "tools",
                          target: t.tool.slug,
                        } satisfies ComboboxValue
                      }
                    >
                      <Shield className="mr-2 h-4 w-4 text-muted-foreground" />
                      {t.tool.name}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {CATEGORY_META[t.tool.category]?.label}
                      </span>
                    </ComboboxItem>
                  );
                }}
              </ComboboxCollection>
            </ComboboxGroup>
          ) : null}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
