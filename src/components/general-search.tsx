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
import { CATEGORY_META, toolDefinitions } from "@/tools";
import { SearchResult, searchTools } from "@/tools/search";
import { useToolHistory } from "@/hooks/use-tool-history";
import { ToolDefinition } from "@/types/tool";
import { Clock, Folder, Shield, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ComboboxValue = {
  source: "tools" | "category" | "tools-directory";
  target: string;
};

export function GeneralSearch({}: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { recentSlugs, favoriteSlugs } = useToolHistory();

  const results = query ? searchTools(query, 8) : [];

  const toTools = (slugs: string[]) =>
    slugs
      .map((slug) => toolDefinitions.find((t) => t.slug === slug))
      .filter((t): t is NonNullable<typeof t> => t !== undefined);

  const recent = toTools(recentSlugs).slice(0, 5);
  const favorites = toTools(favoriteSlugs).slice(0, 5);

  const navigate = (path: string) => {
    setQuery("");
    router.push(path);
  };

  return (
    <Combobox
      onValueChange={(v: ComboboxValue | null) => {
        if (!v) return;
        if (v.source === "tools-directory") {
          navigate("/tools");
          return;
        }
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
                      <Star className="mr-2 size-4 fill-amber-400 text-amber-500" />
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
                      <Clock className="mr-2 size-4 text-muted-foreground" />
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
                      <Folder className="mr-2 size-4 text-muted-foreground" />
                      {CATEGORY_META[c].label}
                    </ComboboxItem>
                  );
                }}
              </ComboboxCollection>
            </ComboboxGroup>
          ) : null}
          {!query ? (
            <ComboboxGroup items={["all-tools"]}>
              <ComboboxLabel>Browse</ComboboxLabel>
              <ComboboxCollection>
                {() => (
                  <ComboboxItem
                    key="all-tools"
                    value={
                      {
                        source: "tools-directory",
                        target: "tools",
                      } satisfies ComboboxValue
                    }
                  >
                    <Folder className="mr-2 size-4 text-muted-foreground" />
                    All tools directory
                  </ComboboxItem>
                )}
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
                      <Shield className="mr-2 size-4 text-muted-foreground" />
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
