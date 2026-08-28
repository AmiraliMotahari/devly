'use client';

import { ToolRunner } from '@/components/tool-runner';
import type { ToolComponentProps } from '@/tools/tool-props';
import type { ToolResult } from '@/types/tool';
import { getExtension } from '@/lib/file-security';

export function ImageFilters({ tool }: ToolComponentProps) {
  return (
    <ToolRunner
      tool={tool}
      processor={async (input, options, ctx): Promise<ToolResult> => {
        const file = input as File;
        const filter = String(options.filter);
        const intensity = Number(options.intensity) / 100;

        const bitmap = await createImageBitmap(file);
        const width = bitmap.width;
        const height = bitmap.height;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not create canvas context.');

        context.imageSmoothingQuality = 'high';
        context.drawImage(bitmap, 0, 0);
        bitmap.close();

        ctx.onProgress(40, 'Applying filter...');

        if (filter === 'none') {
          // No filter
        } else if (filter === 'grayscale') {
          const imageData = context.getImageData(0, 0, width, height);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            data[i] = data[i] + (gray - data[i]) * intensity;
            data[i + 1] = data[i + 1] + (gray - data[i + 1]) * intensity;
            data[i + 2] = data[i + 2] + (gray - data[i + 2]) * intensity;
          }
          context.putImageData(imageData, 0, 0);
        } else if (filter === 'sepia') {
          const imageData = context.getImageData(0, 0, width, height);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const tr = 0.393 * r + 0.769 * g + 0.189 * b;
            const tg = 0.349 * r + 0.686 * g + 0.168 * b;
            const tb = 0.272 * r + 0.534 * g + 0.131 * b;
            data[i] = r + (Math.min(255, tr) - r) * intensity;
            data[i + 1] = g + (Math.min(255, tg) - g) * intensity;
            data[i + 2] = b + (Math.min(255, tb) - b) * intensity;
          }
          context.putImageData(imageData, 0, 0);
        } else if (filter === 'invert') {
          const imageData = context.getImageData(0, 0, width, height);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            data[i] = data[i] + (255 - data[i]) * intensity;
            data[i + 1] = data[i + 1] + (255 - data[i + 1]) * intensity;
            data[i + 2] = data[i + 2] + (255 - data[i + 2]) * intensity;
          }
          context.putImageData(imageData, 0, 0);
        } else if (filter === 'blur') {
          context.filter = `blur(${intensity * 10}px)`;
          context.drawImage(canvas, 0, 0);
          context.filter = 'none';
        } else if (filter === 'brightness') {
          context.filter = `brightness(${intensity})`;
          context.drawImage(canvas, 0, 0);
          context.filter = 'none';
        } else if (filter === 'contrast') {
          context.filter = `contrast(${intensity})`;
          context.drawImage(canvas, 0, 0);
          context.filter = 'none';
        } else if (filter === 'saturate') {
          context.filter = `saturate(${intensity})`;
          context.drawImage(canvas, 0, 0);
          context.filter = 'none';
        } else if (filter === 'hue') {
          context.filter = `hue-rotate(${intensity * 360}deg)`;
          context.drawImage(canvas, 0, 0);
          context.filter = 'none';
        }

        ctx.onProgress(75, 'Encoding...');

        const ext = getExtension(file.name);
        const outputType =
          ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('Filter failed.'))),
            outputType,
            0.92,
          );
        });

        ctx.onProgress(95, 'Finalizing...');

        return {
          filename: file.name,
          blob,
          originalSize: file.size,
          outputSize: blob.size,
          metadata: {
            Filter: filter,
            Intensity: `${Math.round(intensity * 100)}%`,
            Dimensions: `${width} × ${height}`,
          },
        };
      }}
    />
  );
}
