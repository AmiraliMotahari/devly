import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";

export default function CategoryLoading() {
  return (
    <div
      className="container mx-auto px-4 sm:px-6 lg:px-12 py-12 animate-fade-in"
      data-testid="category-loading"
    >
      <div className="mb-8">
        <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Skeleton className="size-6" />
        </div>
        <Skeleton className="w-2/5 h-9" />
        <Skeleton className="w-3/5 h-7 mt-2" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card
            key={`category-loading-card-${i}`}
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
  );
}
