'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { ToolComponentProps } from '@/tools/tool-props';

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace('#', '').match(/^([a-f0-9]{6}|[a-f0-9]{3})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const num = parseInt(h, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function luminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(fg: string, bg: string): number | null {
  const fgRgb = hexToRgb(fg);
  const bgRgb = hexToRgb(bg);
  if (!fgRgb || !bgRgb) return null;
  const l1 = luminance(...fgRgb);
  const l2 = luminance(...bgRgb);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function ContrastChecker({ tool }: ToolComponentProps) {
  void tool;
  const [fg, setFg] = useState('#000000');
  const [bg, setBg] = useState('#ffffff');

  const ratio = contrastRatio(fg, bg);
  const ratioValue = ratio ? ratio.toFixed(2) : '—';
  const passesAA = ratio !== null && ratio >= 4.5;
  const passesAALarge = ratio !== null && ratio >= 3;
  const passesAAA = ratio !== null && ratio >= 7;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Foreground color</label>
          <div className="flex gap-2">
            <input type="color" value={fg} onChange={(e) => setFg(e.target.value)} className="h-10 w-16 cursor-pointer rounded-md border border-border" />
            <Input value={fg} onChange={(e) => setFg(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Background color</label>
          <div className="flex gap-2">
            <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="h-10 w-16 cursor-pointer rounded-md border border-border" />
            <Input value={bg} onChange={(e) => setBg(e.target.value)} />
          </div>
        </div>
      </div>

      <div
        className="flex h-32 items-center justify-center rounded-lg border border-border text-center text-2xl font-bold"
        style={{ backgroundColor: bg, color: fg }}
      >
        Aa Bb Cc 123
      </div>

      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-4xl font-bold tabular-nums">{ratioValue}:1</p>
          <p className="text-sm text-muted-foreground">Contrast ratio</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Badge variant={passesAA ? 'default' : 'destructive'}>AA {passesAA ? 'Pass' : 'Fail'}</Badge>
            <Badge variant={passesAALarge ? 'default' : 'destructive'}>AA Large {passesAALarge ? 'Pass' : 'Fail'}</Badge>
            <Badge variant={passesAAA ? 'default' : 'destructive'}>AAA {passesAAA ? 'Pass' : 'Fail'}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
