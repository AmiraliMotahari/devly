'use client';

import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { ToolComponentProps } from '@/tools/tool-props';

export function QrCodeGenerator({ tool }: ToolComponentProps) {
  const sizeOption = tool.options?.find((o) => o.key === 'size');
  const marginOption = tool.options?.find((o) => o.key === 'margin');
  const formatOption = tool.options?.find((o) => o.key === 'format');

  const defaultSize = Number(sizeOption?.default ?? 256);
  const defaultMargin = Number(marginOption?.default ?? 4);
  const defaultFormat = (formatOption?.default as string) ?? 'png';

  const [text, setText] = useState('https://utilityhub.app');
  const [size, setSize] = useState(defaultSize);
  const [margin, setMargin] = useState(defaultMargin);
  const [format, setFormat] = useState<'png' | 'svg'>(defaultFormat as 'png' | 'svg');
  const [dataUrl, setDataUrl] = useState<string>('');
  const [svgString, setSvgString] = useState<string>('');

  useEffect(() => {
    if (!text) {
      setDataUrl('');
      setSvgString('');
      return;
    }
    QRCode.toDataURL(text, { width: size, margin })
      .then(setDataUrl)
      .catch(() => setDataUrl(''));
    QRCode.toString(text, { type: 'svg', margin })
      .then(setSvgString)
      .catch(() => setSvgString(''));
  }, [text, size, margin]);

  const download = () => {
    if (format === 'png' && dataUrl) {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'qr-code.png';
      a.click();
    } else if (format === 'svg' && svgString) {
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'qr-code.svg';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Text or URL</label>
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Enter text or URL" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">Size (px)</label>
          <Input type="number" min={64} max={1024} value={size} onChange={(e) => setSize(Number(e.target.value))} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Margin</label>
          <Input type="number" min={0} max={10} value={margin} onChange={(e) => setMargin(Number(e.target.value))} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Format</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as 'png' | 'svg')}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="png">PNG</option>
            <option value="svg">SVG</option>
          </select>
        </div>
      </div>
      {dataUrl && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dataUrl} alt="QR code" className="rounded-lg border border-border" />
            <Button onClick={download}>
              <Download className="mr-2 h-4 w-4" /> Download {format.toUpperCase()}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
