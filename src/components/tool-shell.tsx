import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Server, RefreshCw } from "lucide-react";
import type { ToolDefinition } from "@/types/tool";
import { CATEGORY_META } from "@/tools";
import { Skeleton } from "@/components/ui/skeleton";
import { ToolRunnerSkeleton } from "./tool-runner";
import { ToolVisitRecorder } from "@/hooks/use-tool-history";
import { FavoriteButton } from "./favorite-button";

type ToolShellProps = {
  tool: ToolDefinition;
  children: React.ReactNode;
};

export function ToolShell({ tool, children }: ToolShellProps) {
  const category = CATEGORY_META[tool.category];

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <ToolVisitRecorder slug={tool.slug} />
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight className="size-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/category/${tool.category}`}>{category.label}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight className="size-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage>{tool.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight">{tool.name}</h1>
          <FavoriteButton slug={tool.slug} />
        </div>
        <p className="mt-2 text-lg text-muted-foreground">{tool.description}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1.5">
            {tool.processingMode === "client" ? (
              <>
                <ShieldCheck className="size-3 text-success" />
                Local processing
              </>
            ) : tool.processingMode === "server" ? (
              <>
                <Server className="size-3 text-warning" />
                Server processing
              </>
            ) : (
              <>
                <RefreshCw className="size-3 text-primary" />
                Hybrid processing
              </>
            )}
          </Badge>
          {tool.supportsBatch && (
            <Badge variant="outline">Batch supported</Badge>
          )}
          {!tool.requiresAuthentication && (
            <Badge variant="outline">No sign-up needed</Badge>
          )}
        </div>
      </div>

      {tool.processingMode === "client" && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
          <ShieldCheck className="size-4 shrink-0" />
          <span>
            Your files are processed locally in your browser and never uploaded
            to a server.
          </span>
        </div>
      )}

      {tool.available ? (
        children
      ) : (
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-8 text-center">
          <RefreshCw className="mx-auto mb-3 size-8 text-warning" />
          <h3 className="text-lg font-semibold">Coming soon</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {tool.unavailableReason ??
              "This tool requires backend infrastructure that is not yet available."}
          </p>
        </div>
      )}

      {tool.howItWorks && tool.howItWorks.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-3 text-xl font-semibold">How it works</h2>
          <ol className="flex flex-col gap-2">
            {tool.howItWorks.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}

      {tool.faq && tool.faq.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-4 text-xl font-semibold">FAQ</h2>
          <div className="flex flex-col gap-4">
            {tool.faq.map((item, i) => (
              <div key={i}>
                <h3 className="font-medium">{item.question}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ToolShellSkeleton() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="size-4 rounded-full" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="size-4 rounded-full" />
        <Skeleton className="h-4 w-28" />
      </div>

      {/* Header */}
      <div className="mb-6">
        <Skeleton className="h-9 w-2/3 max-w-md" />

        <Skeleton className="mt-3 h-6 w-full max-w-2xl" />
        <Skeleton className="mt-2 h-6 w-4/5 max-w-xl" />

        {/* Badges */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Skeleton className="h-6 w-32 rounded-md" />
          <Skeleton className="h-6 w-28 rounded-md" />
          <Skeleton className="h-6 w-32 rounded-md" />
        </div>
      </div>

      {/* Local processing notice */}
      <div className="mb-6 flex min-h-12 items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
        <Skeleton className="size-4 shrink-0 rounded-sm" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      {/* Tool runner */}
      <ToolRunnerSkeleton />

      {/* How it works */}
      <div className="mt-12">
        <Skeleton className="mb-4 h-6 w-32" />

        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex gap-3">
              <Skeleton className="size-6 shrink-0 rounded-full" />

              <div className="flex flex-1 flex-col gap-2 pt-1">
                <Skeleton className="h-4 w-full max-w-2xl" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-12">
        <Skeleton className="mb-4 h-6 w-16" />

        <div className="flex flex-col gap-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-2">
              <Skeleton className="h-5 w-3/5 max-w-lg" />
              <Skeleton className="h-4 w-full max-w-2xl" />
              <Skeleton className="size-4/5 max-w-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
