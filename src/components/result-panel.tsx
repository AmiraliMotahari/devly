'use client';

import { Download, CheckCircle2, FileIcon, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatFileSize, calculateCompressionRatio } from '@/lib/file-security';
import type { ToolResult } from '@/types/tool';

interface ResultPanelProps {
  results: ToolResult[];
  onProcessAnother: () => void;
  onDownloadAll?: () => void;
}

export function ResultPanel({ results, onProcessAnother, onDownloadAll }: ResultPanelProps) {
  if (results.length === 0) return null;

  const totalOriginal = results.reduce((sum, r) => sum + (r.originalSize ?? 0), 0);
  const totalOutput = results.reduce((sum, r) => sum + (r.outputSize ?? r.blob.size), 0);
  const hasCompression = totalOriginal > 0;
  const savedRatio = calculateCompressionRatio(totalOriginal, totalOutput);
  const isSmaller = totalOutput < totalOriginal;

  const downloadFile = (result: ToolResult) => {
    const url = URL.createObjectURL(result.blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = result.filename;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-success/30 bg-success/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CheckCircle2 className="size-5 text-success" />
          {results.length === 1 ? 'Result' : `${results.length} files ready`}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {hasCompression && totalOutput > 0 && (
          <div className="flex flex-wrap gap-3">
            <div className="rounded-lg border border-border bg-background px-3 py-2">
              <p className="text-xs text-muted-foreground">Original</p>
              <p className="text-sm font-semibold">{formatFileSize(totalOriginal)}</p>
            </div>
            <div className="rounded-lg border border-border bg-background px-3 py-2">
              <p className="text-xs text-muted-foreground">Output</p>
              <p className="text-sm font-semibold">{formatFileSize(totalOutput)}</p>
            </div>
            <div className="rounded-lg border border-border bg-background px-3 py-2">
              <p className="text-xs text-muted-foreground">
                {isSmaller ? "Saved" : "Size change"}
              </p>
              <p className={`text-sm font-semibold ${isSmaller ? "text-success" : ""}`}>
                {isSmaller
                  ? `${savedRatio.toFixed(1)}%`
                  : `+${Math.abs(savedRatio).toFixed(1)}%`}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {results.map((result, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 rounded-lg border border-border bg-background p-3"
            >
              <div className="flex size-10 items-center justify-center rounded-md bg-muted">
                <FileIcon className="size-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{result.filename}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatFileSize(result.blob.size)}</span>
                  {result.originalSize && result.outputSize && (
                    <>
                      <ArrowRight className="size-3" />
                      <Badge
                        variant={result.outputSize < result.originalSize ? "secondary" : "outline"}
                        className="text-xs"
                      >
                        {result.outputSize < result.originalSize
                          ? `${calculateCompressionRatio(result.originalSize, result.outputSize).toFixed(0)}% smaller`
                          : `+${Math.abs(calculateCompressionRatio(result.originalSize, result.outputSize)).toFixed(0)}% larger`}
                      </Badge>
                    </>
                  )}
                </div>
              </div>
              <Button size="sm" onClick={() => downloadFile(result)}>
                <Download data-icon="inline-start" />
                Download
              </Button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {results.length > 1 && onDownloadAll && (
            <Button variant="outline" onClick={onDownloadAll}>
              <Download data-icon="inline-start" />
              Download all (ZIP)
            </Button>
          )}
          <Button variant="ghost" onClick={onProcessAnother}>
            <RefreshCw data-icon="inline-start" />
            Process another
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
