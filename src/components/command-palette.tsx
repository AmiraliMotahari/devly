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
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command>
        <CommandInput
          placeholder="Search for a tool..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>No tools found.</CommandEmpty>

          {!query && favorites.length > 0 && (
            <CommandGroup heading="Favorites">
              {favorites.map((tool) => (
                <CommandItem
                  key={tool.id}
                  value={tool.name}
                  onSelect={() => navigate(`/tools/${tool.slug}`)}
                >
                  <Star className="size-4 fill-amber-400 text-amber-500" />
                  {tool.name}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!query && recent.length > 0 && (
            <CommandGroup heading="Recently used">
              {recent.map((tool) => (
                <CommandItem
                  key={tool.id}
                  value={tool.name}
                  onSelect={() => navigate(`/tools/${tool.slug}`)}
                >
                  <Clock className="mr-2 size-4 text-muted-foreground" />
                  {tool.name}
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

          {query && results.length > 0 && (
            <CommandGroup heading="Tools">
              {results.map(({ tool }) => (
                <CommandItem
                  key={tool.id}
                  value={tool.name}
                  onSelect={() => navigate(`/tools/${tool.slug}`)}
                >
                  <Shield className="mr-2 size-4 text-muted-foreground" />
                  {tool.name}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {CATEGORY_META[tool.category].label}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
