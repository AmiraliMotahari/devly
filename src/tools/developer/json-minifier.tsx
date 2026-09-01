"use client";

import { useState } from 'react';
import { AlertCircle, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CopyToClipboard } from '@/components/copy-to-clipboard';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import type { ToolComponentProps } from '@/tools/tool-props';

export function JsonMinifier({ tool }: ToolComponentProps) {
  void tool;
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const minify = () => {
    setError(null);
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid JSON.');
      setOutput('');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">JSON input</label>
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder='{"key": "value"}'
        className="min-h-50 font-mono text-sm"
      />
      </div>
      <Button onClick={minify} disabled={!input}>
        <Play data-icon="inline-start" /> Minify
      </Button>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Invalid JSON</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {output && !error && (
        <Card>
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">Minified output</label>
              <CopyToClipboard value={output} variant="ghost" size="sm" showLabel />
            </div>
            <Textarea readOnly value={output} className="min-h-25 font-mono text-sm" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}