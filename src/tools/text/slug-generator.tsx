"use client";

import { useState } from 'react';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { ToolComponentProps } from '@/tools/tool-props';

export function SlugGenerator({ tool }: ToolComponentProps) {
  void tool;
  const [text, setText] = useState('');

  const slug = text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(slug);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Could not copy — clipboard unavailable');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="slug-input">Text</Label>
        <Input id="slug-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Enter text to slugify..." />
      </div>
      {slug && (
        <Card>
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <Label htmlFor="slug-output">Slug</Label>
              <Button variant="ghost" size="sm" onClick={copy}>
                <Copy data-icon="inline-start" />
                Copy
              </Button>
            </div>
            <code id="slug-output" className="block rounded-md bg-muted px-3 py-2 font-mono text-sm">{slug}</code>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
