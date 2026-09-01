import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORY_META, TOOL_CATEGORIES, toolDefinitions } from "@/tools";
import {
  CalendarClock,
  Code2,
  FileText,
  FolderArchive,
  Globe,
  Image as ImageIcon,
  Palette,
  Repeat2,
  Sparkles,
  Table,
  Type,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Image: ImageIcon,
  FileText,
  FolderArchive,
  Code2,
  Type,
  Globe,
  Repeat2,
  CalendarClock,
  Palette,
  Table,
};

export const metadata: Metadata = {
  title: "All categories",
  description:
    "Browse every tool category — images, PDF, files, developer, text, data, web, colors, date & time, and converters. All free and processed locally in your browser.",
};

export default async function CategoryPage() {
  const categories = TOOL_CATEGORIES;

  return (
    <section className="container mx-auto px-4 py-12 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Browse by category
        </h1>
      </div>

      {categories.length === 0 ? (
        <p className="text-muted-foreground">
          No tools available in this category yet.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {categories.map((cat) => {
            const Icon = ICON_MAP[CATEGORY_META[cat].icon] ?? Sparkles;
            const count = toolDefinitions.filter(
              (t) => t.category === cat && t.available,
            ).length;
            return (
              <Link key={cat} href={`/category/${cat}`}>
                <Card className="group h-full transition-all hover:border-primary/50 hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <h3 className="font-semibold">
                      {CATEGORY_META[cat].label}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {CATEGORY_META[cat].description}
                    </p>
                    <Badge variant="outline" className="mt-3">
                      {count} tools
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
