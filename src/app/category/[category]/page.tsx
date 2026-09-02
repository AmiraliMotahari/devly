import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORY_META, getToolsByCategory, TOOL_CATEGORIES } from "@/tools";
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
  Table,
  Type,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

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

type PageParams = Promise<{ category: string | undefined }>;
type PageProps = {
  params: PageParams;
};

export async function generateStaticParams() {
  return TOOL_CATEGORIES.map((category) => ({ category }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const awaitedParams = await params;
  const cat = awaitedParams.category as keyof typeof CATEGORY_META;

  const meta = CATEGORY_META[cat];
  if (!meta) return {};

  return {
    title: `${meta.label} tools`,
    description: meta.description,
  };
}

const CategoryDetails = async ({ params }: { params: PageParams }) => {
  const awaitedParams = await params;
  const cat = awaitedParams.category as keyof typeof CATEGORY_META;

  const meta = CATEGORY_META[cat];
  if (!meta) notFound();

  const tools = getToolsByCategory(cat).filter((t) => t.available);
  const Icon = ICON_MAP[meta.icon] ?? ArrowRight;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-12 py-12 animate-fade-in">
      <div className="mb-8">
        <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-6" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          {meta.label} tools
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">{meta.description}</p>
      </div>

      {tools.length === 0 ? (
        <p className="text-muted-foreground">
          No tools available in this category yet.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <Link key={tool.id} href={`/tools/${tool.slug}`}>
              <Card className="group h-full transition-all hover:border-primary/50 hover:shadow-md">
                <CardContent className="p-5">
                  <h3 className="font-semibold">{tool.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {tool.description}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    {tool.processingMode === "client" && (
                      <Badge variant="secondary" className="text-xs">
                        Local
                      </Badge>
                    )}
                    {tool.supportsBatch && (
                      <Badge variant="outline" className="text-xs">
                        Batch
                      </Badge>
                    )}
                    <span className="ml-auto text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      Open <ArrowRight className="inline size-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default async function CategoryPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 sm:px-6 lg:px-12 py-12 animate-fade-in">
          <div className="mb-8">
            <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Skeleton className="size-6" />
            </div>
            <Skeleton className="w-2/5 h-9" />
            <Skeleton className="w-3/5 h-7 mt-2" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card
                key={`category-skeleton-card-${i}`}
                className="group h-full transition-all hover:border-primary/50 hover:shadow-md"
              >
                <CardContent className="p-5">
                  <Skeleton className="w-full h-5" />
                  <Skeleton className="w-full h-10 mt-1" />
                  <div className="mt-3 flex items-center gap-2">
                    <Skeleton className="w-12 h-5 rounded-full" />
                    <Skeleton className="w-12 h-5 rounded-full" />
                    <span className="ml-auto text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      Open <ArrowRight className="inline size-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      }
    >
      <CategoryDetails params={params} />
    </Suspense>
  );
}
