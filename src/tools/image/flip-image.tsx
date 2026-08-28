'use client';

import { ToolRunner } from '@/components/tool-runner';
import type { ToolComponentProps } from '@/tools/tool-props';
import type { ToolResult } from '@/types/tool';
import { getExtension } from '@/lib/file-security';

export function FlipImage({ tool }: ToolComponentProps) {
  return (
    <ToolRunner
      tool={tool}
      processor={async (input, options, ctx): Promise<ToolResult> => {
        const file = input as File;
        const direction = String(options.direction);

        const bitmap = await createImageBitmap(file);
        const width = bitmap.width;
        const height = bitmap.height;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not create canvas context.');

        context.imageSmoothingQuality = 'high';

        if (direction === 'horizontal') {
          context.translate(width, 0);
          context.scale(-1, 1);
        } else if (direction === 'vertical') {
          context.translate(0, height);
          context.scale(1, -1);
        } else {
          context.translate(width, height);
          context.scale(-1, -1);
        }

        context.drawImage(bitmap, 0, 0);
        bitmap.close();

        ctx.onProgress(70, 'Flipping...');

        const ext = getExtension(file.name);
        const outputType =
          ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('Flip failed.'))),
            outputType,
            0.92,
          );
        });

        ctx.onProgress(90, 'Finalizing...');

        return {
          filename: file.name,
          blob,
          originalSize: file.size,
          outputSize: blob.size,
          metadata: {
            'Original dimensions': `${width} × ${height}`,
            'New dimensions': `${width} × ${height}`,
            Direction: direction,
          },
        };
      }}
    />
  );
}
