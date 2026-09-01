'use client';

import { ToolRunner } from '@/components/tool-runner';
import type { ToolComponentProps } from '@/tools/tool-props';
import type { ToolResult } from '@/types/tool';
import { replaceExtension, getExtension } from '@/lib/file-security';

export function ImageWatermark({ tool }: ToolComponentProps) {
  return (
    <ToolRunner
      tool={tool}
      processor={async (input, options, ctx): Promise<ToolResult> => {
        const file = input as File;
        const text = String(options.text ?? 'Sample');
        const position = String(options.position ?? 'bottom-right');
        const fontSize = Math.min(200, Math.max(8, Number(options.fontSize) || 32));
        const opacity = Math.min(100, Math.max(5, Number(options.opacity) || 50)) / 100;

        if (!text.trim()) throw new Error('Watermark text cannot be empty.');

        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not create canvas context.');

        context.drawImage(bitmap, 0, 0);
        bitmap.close();

        ctx.onProgress(50, 'Applying watermark...');

        const margin = Math.round(fontSize * 0.75);
        context.font = `600 ${fontSize}px system-ui, sans-serif`;
        context.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        context.strokeStyle = `rgba(0, 0, 0, ${opacity / 2})`;
        context.lineWidth = Math.max(1, fontSize / 16);
        context.textBaseline = 'top';

        const metrics = context.measureText(text);
        const textW = metrics.width;
        const textH = fontSize;

        let x: number;
        let y: number;
        switch (position) {
          case 'top-left':
            x = margin; y = margin; break;
          case 'top-right':
            x = canvas.width - textW - margin; y = margin; break;
          case 'bottom-left':
            x = margin; y = canvas.height - textH - margin; break;
          case 'center':
            x = (canvas.width - textW) / 2; y = (canvas.height - textH) / 2; break;
          case 'bottom-right':
          default:
            x = canvas.width - textW - margin; y = canvas.height - textH - margin; break;
        }

        context.strokeText(text, x, y);
        context.fillText(text, x, y);

        ctx.onProgress(80, 'Encoding...');

        const ext = getExtension(file.name);
        const outputType =
          ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('Watermark failed.'))),
            outputType,
            0.92,
          );
        });

        ctx.onProgress(90, 'Finalizing...');

        return {
          filename: replaceExtension(file.name, ext === 'jpeg' ? 'jpg' : ext),
          blob,
          originalSize: file.size,
          outputSize: blob.size,
        };
      }}
    />
  );
}
