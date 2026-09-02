"use client";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useToolHistory } from "@/hooks/use-tool-history";
import { CATEGORY_META, toolDefinitions } from "@/tools";
import { searchTools } from "@/tools/search";
import { Clock, Folder, Shield, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { recentSlugs, favoriteSlugs } = useToolHistory();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  const results = query ? searchTools(query, 8) : [];

  // Collapse near-identical hits (same slug) so the palette never shows
  // duplicate rows for one tool.
  const seen = new Set<string>();
  const dedupedResults = results.filter(({ tool }) => {
    if (seen.has(tool.slug)) return false;
    seen.add(tool.slug);
    return true;
  });

  const toTools = (slugs: string[]) =>
    slugs
      .map((slug) => toolDefinitions.find((t) => t.slug === slug))
      .filter((t): t is NonNullable<typeof t> => t !== undefined);

  const recent = toTools(
    recentSlugs.filter((resent) => !favoriteSlugs.includes(resent)),
  ).slice(0, 5);
  const favorites = toTools(favoriteSlugs).slice(0, 5);

  const navigate = (path: string) => {
    onOpenChange(false);
    setQuery("");
    router.push(path);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      className="max-sm:top-1/6"
    >
      <Command>
        <CommandInput
          placeholder="Search for a tool..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {!query && favorites.length > 0 && (
            <CommandGroup heading="Favorites">
              {favorites.map((tool) => (
                <CommandItem
                  key={tool.id}
                  value={tool.name}
                  onSelect={() => navigate(`/tools/${tool.slug}`)}
                >
                  <Star className="size-4 fill-amber-400 text-amber-500" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{tool.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {tool.description}
                    </span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!query && recent.length > 0 && (
            <CommandGroup heading="Recently used">
              {recent.map((tool) => (
                <CommandItem
                  key={tool.id}
                  value={`${tool.name} ${tool.slug}`}
                  onSelect={() => navigate(`/tools/${tool.slug}`)}
                >
                  <Clock className="size-4 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{tool.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {tool.description}
                    </span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!query && (
            <CommandGroup heading="Categories">
              {(
                Object.keys(CATEGORY_META) as (keyof typeof CATEGORY_META)[]
              ).map((cat) => (
                <CommandItem
                  key={cat}
                  value={CATEGORY_META[cat].label}
                  onSelect={() => navigate(`/category/${cat}`)}
                >
                  <Folder className="mr-2 size-4 text-muted-foreground" />
                  {CATEGORY_META[cat].label}
                </CommandItem>
              ))}
              <CommandItem
                value="all tools"
                onSelect={() => navigate("/tools")}
              >
                <Folder className="mr-2 size-4 text-muted-foreground" />
                All tools
              </CommandItem>
            </CommandGroup>
          )}

          {query && dedupedResults.length > 0 && (
            <CommandGroup heading="Tools">
              {dedupedResults.map(({ tool }) => (
                <CommandItem
                  key={tool.id}
                  value={`${tool.name} ${tool.slug}`}
                  onSelect={() => navigate(`/tools/${tool.slug}`)}
                >
                  <Shield className="size-4 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{tool.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {tool.description}
                    </span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {query && dedupedResults.length === 0 && (
            <CommandEmpty>No tools found for “{query}”.</CommandEmpty>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
