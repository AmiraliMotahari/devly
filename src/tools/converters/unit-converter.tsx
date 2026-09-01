'use client';

import { useState } from 'react';
import { CopyToClipboard } from '@/components/copy-to-clipboard';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="unit-category">Category</Label>
        <Select value={category} onValueChange={handleCategoryChange}>
          <SelectTrigger id="unit-category" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(UNITS).map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="unit-value">From</Label>
          <div className="flex gap-2">
            <Input id="unit-value" type="number" value={value} onChange={(e) => setValue(e.target.value)} />
            <Select value={from} onValueChange={setFrom}>
              <SelectTrigger className="w-28" aria-label="From unit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {unitKeys.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="unit-result">To</Label>
          <div className="flex gap-2">
            <Input id="unit-result" readOnly value={result} className="font-mono" />
            <Select value={to} onValueChange={setTo}>
              <SelectTrigger className="w-28" aria-label="To unit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {unitKeys.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-xs text-muted-foreground">Result</p>
            <p className="text-2xl font-bold tabular-nums">{value} {from} = {result} {to}</p>
          </div>
          <CopyToClipboard value={result} variant="ghost" size="sm" showLabel />
        </CardContent>
      </Card>
    </div>
  );
}
