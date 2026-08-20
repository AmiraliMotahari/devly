import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ToolDefinition } from '@/types/tool';
import { getRelatedTools, CATEGORY_META } from '@/tools';

export function RelatedTools({ tool }: { tool: ToolDefinition }) {
  const related = getRelatedTools(tool);
  if (related.length === 0) return null;

  return (
    <div className="container mx-auto max-w-4xl px-4 pb-12">
      <h2 className="mb-4 text-xl font-semibold">Related tools</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {related.map((rel) => (
          <Link key={rel.id} href={`/tools/${rel.slug}`}>
            <Card className="transition-colors hover:border-primary/50 hover:bg-accent/50">
              <CardContent className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{rel.name}</p>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {CATEGORY_META[rel.category].label}
                  </Badge>
                </div>
                <ArrowRight className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
