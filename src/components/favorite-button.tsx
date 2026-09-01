"use client";

import { Star } from "lucide-react";
import { useToolHistory } from "@/hooks/use-tool-history";
import { cn } from "@/lib/utils";

export function FavoriteButton({ slug }: { slug: string }) {
  const { favoriteSlugs, toggleFavorite } = useToolHistory();
  const active = favoriteSlugs.includes(slug);

  return (
    <button
      type="button"
      aria-label={active ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={active}
      onClick={() => toggleFavorite(slug)}
      className={cn(
        "shrink-0 rounded-full p-2.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        active && "text-amber-500 hover:text-amber-600"
      )}
    >
      <Star
        className={cn("size-5", active && "fill-amber-400 text-amber-500")}
      />
    </button>
  );
}
