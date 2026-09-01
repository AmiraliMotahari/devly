"use client";

import { useState } from 'react';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CopyToClipboard } from '@/components/copy-to-clipboard';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import type { ToolComponentProps } from '@/tools/tool-props';

export function UrlEncodeDecode({ tool }: ToolComponentProps) {
  const modeOption = tool.options?.find((o) => o.key === 'mode');
  const defaultMode = (modeOption?.default as string) ?? 'encode';

  const [mode, setMode] = useState<'encode' | 'decode'>(defaultMode as 'encode' | 'decode');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    try {
      if (mode === 'encode') {
        setOutput(encodeURIComponent(input));
      } else {
        setOutput(decodeURIComponent(input));
      }
    } catch {
      setError('Invalid input for decoding.');
      setOutput('');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Button variant={mode === 'encode' ? 'default' : 'outline'} size="sm" onClick={() => { setMode('encode'); setOutput(''); }}>
          Encode
        </Button>
        <Button variant={mode === 'decode' ? 'default' : 'outline'} size="sm" onClick={() => { setMode('decode'); setOutput(''); }}>
          Decode
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">{mode === 'encode' ? 'Text to encode' : 'URL to decode'}</label>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === 'encode' ? 'Enter text...' : 'Enter encoded URL...'}
          className="min-h-30 font-mono text-sm"
        />
      </div>
      <Button onClick={run} disabled={!input}>
        <ArrowRight data-icon="inline-start" /> {mode === 'encode' ? 'Encode' : 'Decode'}
      </Button>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {output && !error && (
        <Card>
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">Result</label>
              <CopyToClipboard value={output} variant="ghost" size="sm" showLabel />
            </div>
            <Textarea readOnly value={output} className="min-h-30 font-mono text-sm" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}