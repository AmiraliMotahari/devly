"use client";

import { GeneralSearch } from "@/components/general-search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORY_META, toolDefinitions } from "@/tools";
import type { ToolCategory } from "@/types/tool";
import {
  ArrowRight,
  CalendarClock,
  Code2,
  FileText,
  FolderArchive,
  Globe,
  Image as ImageIcon,
  Palette,
  Repeat2,
  Search,
  ShieldCheck,
  Sparkles,
  Table,
  Type,
  Zap,
} from "lucide-react";
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

const POPULAR_SLUGS = [
  "jpg-to-webp",
  "compress-image",
  "merge-pdf",
  "split-pdf",
  "json-formatter",
  "qr-code-generator",
  "uuid-generator",
  "unit-converter",
];

export default function HomePage() {
  const popularTools = POPULAR_SLUGS.map((slug) =>
    toolDefinitions.find((t) => t.slug === slug),
  ).filter((t): t is NonNullable<typeof t> => t !== undefined);

  const featuredTools = toolDefinitions
    .filter((t) => t.available && t.category !== "developer")
    .slice(0, 8);

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 bg-linear-to-b from-primary/5 via-transparent to-transparent z-10" />
        <div className="relative container mx-auto px-4 py-20 text-center z-20">
          <Badge variant="outline" className="mb-4 gap-1.5">
            <Sparkles className="h-3 w-3 text-primary" />
            {toolDefinitions.filter((t) => t.available).length} tools and
            counting
          </Badge>
          <h1 className="mx-auto max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Your everyday file &amp; web toolkit
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-balance text-lg text-muted-foreground">
            Convert, compress, and transform files, images, PDFs, and data — all
            in your browser. No sign-up, no uploads, completely private.
          </p>

          <GeneralSearch className={"mx-auto mt-8 max-w-xl z-10"} />

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-success" />
              Files never leave your device
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-amber-500" />
              Instant processing
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              No sign-up required
            </span>
          </div>
        </div>
      </section>

      {/* Popular Tools */}
      <section className="container mx-auto px-4 py-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Popular tools</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {popularTools.map((tool) => (
            <Link key={tool.id} href={`/tools/${tool.slug}`}>
              <Card className="group h-full transition-all hover:border-primary/50 hover:shadow-md">
                <CardContent className="p-5">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {(() => {
                      const Icon =
                        ICON_MAP[CATEGORY_META[tool.category].icon] ?? Sparkles;
                      return <Icon className="h-5 w-5" />;
                    })()}
                  </div>
                  <h3 className="font-semibold">{tool.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {tool.description}
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Open tool <ArrowRight className="h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="mb-6 text-2xl font-bold tracking-tight">
          Browse by category
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {(Object.keys(CATEGORY_META) as ToolCategory[]).map((cat) => {
            const Icon = ICON_MAP[CATEGORY_META[cat].icon] ?? Sparkles;
            const count = toolDefinitions.filter(
              (t) => t.category === cat && t.available,
            ).length;
            return (
              <Link key={cat} href={`/category/${cat}`}>
                <Card className="group h-full transition-all hover:border-primary/50 hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
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
      </section>

      {/* Featured Utilities */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="mb-6 text-2xl font-bold tracking-tight">
          Featured utilities
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featuredTools.map((tool) => (
            <Link key={tool.id} href={`/tools/${tool.slug}`}>
              <Card className="group h-full transition-all hover:border-primary/50 hover:shadow-md">
                <CardContent className="p-5">
                  <h3 className="font-semibold">{tool.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {tool.description}
                  </p>
                  <Badge variant="outline" className="mt-3 text-xs">
                    {CATEGORY_META[tool.category].label}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border/60 bg-muted/30">
        <div className="container mx-auto px-4 py-16">
          <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">
            How it works
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: Search,
                title: "Find your tool",
                description:
                  "Search or browse categories to find the utility you need.",
              },
              {
                icon: ShieldCheck,
                title: "Process privately",
                description:
                  "Most tools run entirely in your browser. Your files never leave your device.",
              },
              {
                icon: ArrowRight,
                title: "Download results",
                description:
                  "Get your converted, compressed, or transformed files instantly.",
              },
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <step.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy banner */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="mx-auto max-w-2xl">
          <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-success" />
          <h2 className="text-2xl font-bold tracking-tight">
            Privacy by design
          </h2>
          <p className="mt-2 text-muted-foreground">
            UtilityHub processes your files locally in your browser whenever
            possible. No uploads, no tracking, no storing your data on servers.
            What you process stays yours.
          </p>
          <Button asChild className="mt-6">
            <Link href="/category/files">Browse tools</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
