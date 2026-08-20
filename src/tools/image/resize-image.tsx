'use client';

import { ToolRunner } from '@/components/tool-runner';
import type { ToolComponentProps } from '@/tools/tool-props';
import type { ToolResult, ProcessingContext } from '@/types/tool';
import { getExtension } from '@/lib/file-security';

export function ResizeImage({ tool }: ToolComponentProps) {
  return (
    <ToolRunner
      tool={tool}
      processor={async (input, options, ctx): Promise<ToolResult> => {
        const file = input as File;
        const maxWidth = Number(options.maxWidth);
        const maxHeight = Number(options.maxHeight);
        const maintainAspect = Boolean(options.maintainAspect);

        const bitmap = await createImageBitmap(file);
        const originalWidth = bitmap.width;
        const originalHeight = bitmap.height;
        let newWidth = originalWidth;
        let newHeight = originalHeight;

        if (maxWidth > 0 && newWidth > maxWidth) {
          const ratio = maxWidth / newWidth;
          newWidth = maxWidth;
          if (maintainAspect) newHeight = Math.round(newHeight * ratio);
        }
        if (maxHeight > 0 && newHeight > maxHeight) {
          const ratio = maxHeight / newHeight;
          newHeight = maxHeight;
          if (maintainAspect) newWidth = Math.round(newWidth * ratio);
        }

        if (newWidth === originalWidth && newHeight === originalHeight) {
          bitmap.close();
          throw new Error('Image is already within the specified dimensions.');
        }

        const canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not create canvas context.');

        context.imageSmoothingQuality = 'high';
        context.drawImage(bitmap, 0, 0, newWidth, newHeight);
        bitmap.close();

        ctx.onProgress(70, 'Resizing...');

        const ext = getExtension(file.name);
        const outputType =
          ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('Resize failed.'))),
            outputType,
            0.92
          );
        });

        ctx.onProgress(90, 'Finalizing...');

        return {
          filename: file.name,
          blob,
          originalSize: file.size,
          outputSize: blob.size,
          metadata: {
            'Original dimensions': `${originalWidth} × ${originalHeight}`,
            'New dimensions': `${newWidth} × ${newHeight}`,
          },
        };
      }}
    />
  );
}
