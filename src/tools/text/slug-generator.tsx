'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { ToolComponentProps } from '@/tools/tool-props';

export function SlugGenerator({ tool }: ToolComponentProps) {
  void tool;
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);

  const slug = text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const copy = () => {
    navigator.clipboard.writeText(slug);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Text</label>
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Enter text to slugify..." />
      </div>
      {slug && (
        <Card>
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">Slug</label>
              <Button variant="ghost" size="sm" onClick={copy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <code className="block rounded-md bg-muted px-3 py-2 font-mono text-sm">{slug}</code>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
