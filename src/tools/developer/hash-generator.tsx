"use client";

import { useState } from 'react';
import { Copy, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { ToolComponentProps } from '@/tools/tool-props';

export function HashGenerator({ tool }: ToolComponentProps) {
  const algoOption = tool.options?.find((o) => o.key === 'algorithm');
  const defaultAlgo = (algoOption?.default as string) ?? 'SHA-256';

  const [algorithm, setAlgorithm] = useState(defaultAlgo);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');

  const run = async () => {
    if (!input) return;
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest(algorithm, data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    setOutput(hex);
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
        <label htmlFor="hash-algorithm" className="text-sm font-medium">Algorithm</label>
        <Select value={algorithm} onValueChange={setAlgorithm}>
          <SelectTrigger id="hash-algorithm" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SHA-1">SHA-1</SelectItem>
            <SelectItem value="SHA-256">SHA-256</SelectItem>
            <SelectItem value="SHA-384">SHA-384</SelectItem>
            <SelectItem value="SHA-512">SHA-512</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Input text</label>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter text to hash..."
          className="min-h-30 font-mono text-sm"
        />
      </div>
      <Button onClick={run} disabled={!input}>
        <Play data-icon="inline-start" /> Generate hash
      </Button>
      {output && (
        <Card>
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">{algorithm} hash</label>
              <Button variant="ghost" size="sm" onClick={copy}>
                <Copy data-icon="inline-start" />
                Copy
              </Button>
            </div>
            <Textarea readOnly value={output} className="min-h-20 font-mono text-sm" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}