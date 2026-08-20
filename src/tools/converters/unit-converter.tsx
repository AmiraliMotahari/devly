'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { ToolComponentProps } from '@/tools/tool-props';

const UNITS: Record<string, Record<string, number>> = {
  length: {
    mm: 0.001, cm: 0.01, m: 1, km: 1000,
    in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344,
  },
  weight: {
    mg: 0.000001, g: 0.001, kg: 1, t: 1000,
    oz: 0.0283495, lb: 0.453592,
  },
  temperature: {
    c: 1, f: 1, k: 1,
  },
  speed: {
    'm/s': 1, 'km/h': 0.277778, mph: 0.44704, knot: 0.514444,
  },
  data: {
    b: 1, kb: 1024, mb: 1048576, gb: 1073741824, tb: 1099511627776,
  },
  area: {
    'm²': 1, 'km²': 1000000, 'ft²': 0.092903, 'yd²': 0.836127, 'acre': 4046.86, 'ha': 10000,
  },
  volume: {
    ml: 0.001, l: 1, 'm³': 1000, 'gal': 3.78541, 'qt': 0.946353, 'pt': 0.473176, 'cup': 0.236588,
  },
};

function convertTemp(value: number, from: string, to: string): number {
  let c: number;
  if (from === 'c') c = value;
  else if (from === 'f') c = (value - 32) * 5 / 9;
  else c = value - 273.15;
  if (to === 'c') return c;
  if (to === 'f') return c * 9 / 5 + 32;
  return c + 273.15;
}

export function UnitConverter({ tool }: ToolComponentProps) {
  const catOption = tool.options?.find((o) => o.key === 'category');
  const defaultCat = (catOption?.default as string) ?? 'length';

  const [category, setCategory] = useState(defaultCat);
  const [from, setFrom] = useState('m');
  const [to, setTo] = useState('ft');
  const [value, setValue] = useState('1');
  const [copied, setCopied] = useState(false);

  const unitKeys = Object.keys(UNITS[category] || {});

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    const keys = Object.keys(UNITS[cat]);
    setFrom(keys[0]);
    setTo(keys[1] || keys[0]);
  };

  const numValue = Number(value);
  let result = '—';
  if (!isNaN(numValue) && unitKeys.includes(from) && unitKeys.includes(to)) {
    if (category === 'temperature') {
      result = convertTemp(numValue, from, to).toFixed(4);
    } else {
      const fromFactor = UNITS[category][from];
      const toFactor = UNITS[category][to];
      result = ((numValue * fromFactor) / toFactor).toFixed(4);
    }
  }

  const copy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Category</label>
        <select
          value={category}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          {Object.keys(UNITS).map((cat) => (
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">From</label>
          <div className="flex gap-2">
            <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} />
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="flex h-9 w-28 rounded-md border border-input bg-background px-3 text-sm"
            >
              {unitKeys.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">To</label>
          <div className="flex gap-2">
            <Input readOnly value={result} className="font-mono" />
            <select
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="flex h-9 w-28 rounded-md border border-input bg-background px-3 text-sm"
            >
              {unitKeys.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-xs text-muted-foreground">Result</p>
            <p className="text-2xl font-bold tabular-nums">{value} {from} = {result} {to}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={copy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
