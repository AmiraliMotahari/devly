import type { ToolDefinition } from "@/types/tool";
import { toolDefinitions } from "./definitions";

export interface SearchResult {
  tool: ToolDefinition;
  score: number;
}

export function searchTools(query: string, limit = 20): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const terms = q.split(/\s+/);
  const results: SearchResult[] = [];

  for (const tool of toolDefinitions) {
    if (!tool.available) continue;

    const name = tool.name.toLowerCase();
    const description = tool.description.toLowerCase();
    const aliases = (tool.aliases ?? []).map((a) => a.toLowerCase());
    const keywords = (tool.keywords ?? []).map((k) => k.toLowerCase());
    const category = tool.category.toLowerCase();

    let score = 0;

    for (const term of terms) {
      if (name === term) score += 100;
      else if (name.startsWith(term)) score += 60;
      else if (name.includes(term)) score += 40;

      if (aliases.some((a) => a === term)) score += 70;
      else if (aliases.some((a) => a.startsWith(term))) score += 35;
      else if (aliases.some((a) => a.includes(term))) score += 20;

      if (keywords.some((k) => k === term)) score += 50;
      else if (keywords.some((k) => k.includes(term))) score += 25;

      if (description.includes(term)) score += 10;
      if (category.includes(term)) score += 15;

      if (tool.acceptFileTypes?.some((t) => t.includes(term))) score += 15;
    }

    if (score > 0) {
      results.push({ tool, score });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
