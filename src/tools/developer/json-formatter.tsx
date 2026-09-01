"use client";

import { useState } from 'react';
import { Copy, AlertCircle, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import type { ToolComponentProps } from '@/tools/tool-props';
import { appName } from '@/lib/constants';

export function JsonFormatter({ tool }: ToolComponentProps) {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const indentOption = tool.options?.find((o) => o.key === 'indent');
  const indentValue = indentOption ? String(indentOption.default) : '2';
  const indent = indentValue === 'tab' ? '\t' : Number(indentValue);

  const format = () => {
    setError(null);
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, indent));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid JSON.');
      setOutput('');
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy — clipboard unavailable");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">JSON input</label>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`{"name":"${appName}","version":1}`}
          className="min-h-50 font-mono text-sm"
        />
      </div>
      <Button onClick={format} disabled={!input}>
        <Play data-icon="inline-start" /> Format
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
              <label className="text-sm font-medium">Formatted output</label>
              <Button variant="ghost" size="sm" onClick={copy}>
<Copy data-icon="inline-start" />
                Copy
              </Button>
            </div>
            <Textarea
              readOnly
              value={output}
              className="min-h-50 font-mono text-sm"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}