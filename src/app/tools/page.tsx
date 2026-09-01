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
  title: "All tools",
  description:
    "Browse every tool in the toolkit — file converters, image and PDF utilities, developer tools, text utilities, data converters and more. All running locally in your browser.",
  alternates: {
    canonical: "/tools",
  },
};

export default function ToolsDirectoryPage() {
  const availableTools = toolDefinitions.filter((t) => t.available);

  return (
    <section className="container mx-auto animate-fade-in px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">All tools</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          {availableTools.length} tools across {TOOL_CATEGORIES.length}{" "}
          categories — all free, no sign-up, and processed locally in your
          browser.
        </p>
      </div>

      <div className="flex flex-col gap-12">
        {TOOL_CATEGORIES.map((cat) => {
          const tools = availableTools.filter((t) => t.category === cat);
          if (tools.length === 0) return null;

          const Icon = ICON_MAP[CATEGORY_META[cat].icon] ?? Sparkles;

          return (
            <section key={cat} aria-labelledby={`category-${cat}`}>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <div>
                  <h2
                    id={`category-${cat}`}
                    className="text-xl font-semibold tracking-tight"
                  >
                    <Link
                      href={`/category/${cat}`}
                      className="transition-colors hover:text-primary"
                    >
                      {CATEGORY_META[cat].label}
                    </Link>
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {CATEGORY_META[cat].description}
                  </p>
                </div>
                <Badge variant="outline" className="ml-auto shrink-0">
                  {tools.length} tools
                </Badge>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {tools.map((tool) => (
                  <Link key={tool.id} href={`/tools/${tool.slug}`}>
                    <Card className="group h-full transition-all hover:border-primary/50 hover:shadow-md">
                      <CardContent className="p-4">
                        <h3 className="font-medium">{tool.name}</h3>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {tool.description}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
