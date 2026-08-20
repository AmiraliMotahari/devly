'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { ToolComponentProps } from '@/tools/tool-props';

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace('#', '').match(/^([a-f0-9]{6}|[a-f0-9]{3})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const num = parseInt(h, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (d !== 0) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(v * 100)];
}

export function ColorConverter({ tool }: ToolComponentProps) {
  void tool;
  const [hex, setHex] = useState('#3b82f6');
  const [copied, setCopied] = useState<string>('');

  const rgb = hexToRgb(hex);
  const r = rgb?.[0] ?? 0;
  const g = rgb?.[1] ?? 0;
  const b = rgb?.[2] ?? 0;
  const [h, s, l] = rgb ? rgbToHsl(r, g, b) : [0, 0, 0];
  const [hv, sv, vv] = rgb ? rgbToHsv(r, g, b) : [0, 0, 0];

  const formats = [
    { label: 'HEX', value: hex.toUpperCase() },
    { label: 'RGB', value: `rgb(${r}, ${g}, ${b})` },
    { label: 'HSL', value: `hsl(${h}, ${s}%, ${l}%)` },
    { label: 'HSV', value: `hsv(${hv}, ${sv}%, ${vv}%)` },
  ];

  const copy = (value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(value);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Color picker</label>
          <input
            type="color"
            value={hex}
            onChange={(e) => setHex(e.target.value)}
            className="h-10 w-20 cursor-pointer rounded-md border border-border"
          />
        </div>
        <div className="space-y-2 flex-1 min-w-[160px]">
          <label className="text-sm font-medium">HEX</label>
          <Input value={hex} onChange={(e) => setHex(e.target.value)} placeholder="#3b82f6" />
        </div>
      </div>

      {rgb && (
        <div
          className="h-24 rounded-lg border border-border"
          style={{ backgroundColor: hex }}
        />
      )}

      <div className="space-y-2">
        {formats.map((f) => (
          <Card key={f.label}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">{f.label}</p>
                <p className="font-mono text-sm">{f.value}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => copy(f.value)}>
                {copied === f.value ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
