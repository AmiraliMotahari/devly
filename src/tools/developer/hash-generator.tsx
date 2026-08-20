'use client';

import { useState } from 'react';
import { Copy, Check, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import type { ToolComponentProps } from '@/tools/tool-props';

export function HashGenerator({ tool }: ToolComponentProps) {
  const algoOption = tool.options?.find((o) => o.key === 'algorithm');
  const defaultAlgo = (algoOption?.default as string) ?? 'SHA-256';

  const [algorithm, setAlgorithm] = useState(defaultAlgo);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const run = async () => {
    if (!input) return;
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest(algorithm, data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    setOutput(hex);
  };

  const copy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Algorithm</label>
        <select
          value={algorithm}
          onChange={(e) => setAlgorithm(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="SHA-1">SHA-1</option>
          <option value="SHA-256">SHA-256</option>
          <option value="SHA-384">SHA-384</option>
          <option value="SHA-512">SHA-512</option>
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Input text</label>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter text to hash..."
          className="min-h-30 font-mono text-sm"
        />
      </div>
      <Button onClick={run} disabled={!input}>
        <Play className="mr-2 h-4 w-4" /> Generate hash
      </Button>
      {output && (
        <Card>
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">{algorithm} hash</label>
              <Button variant="ghost" size="sm" onClick={copy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <Textarea readOnly value={output} className="min-h-20 font-mono text-sm" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
