'use client';

import { ToolRunner } from '@/components/tool-runner';
import type { ToolComponentProps } from '@/tools/tool-props';
import type { ToolResult } from '@/types/tool';
import { getExtension } from '@/lib/file-security';

export function RotateImage({ tool }: ToolComponentProps) {
  return (
    <ToolRunner
      tool={tool}
      processor={async (input, options, ctx): Promise<ToolResult> => {
        const file = input as File;
        const angleMode = String(options.angle);
        const customAngle = Number(options.customAngle) || 0;
        const angle = angleMode === 'custom' ? customAngle : Number(angleMode);

        const bitmap = await createImageBitmap(file);
        const radians = (angle * Math.PI) / 180;
        const sin = Math.abs(Math.sin(radians));
        const cos = Math.abs(Math.cos(radians));
        const originalWidth = bitmap.width;
        const originalHeight = bitmap.height;
        const newWidth = Math.round(originalWidth * cos + originalHeight * sin);
        const newHeight = Math.round(originalWidth * sin + originalHeight * cos);

        const canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not create canvas context.');

        context.imageSmoothingQuality = 'high';
        context.translate(newWidth / 2, newHeight / 2);
        context.rotate(radians);
        context.drawImage(bitmap, -originalWidth / 2, -originalHeight / 2);
        bitmap.close();

        ctx.onProgress(70, 'Rotating...');

        const ext = getExtension(file.name);
        const outputType =
          ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('Rotation failed.'))),
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
            'Original dimensions': `${originalWidth} × ${originalHeight}`,
            'New dimensions': `${newWidth} × ${newHeight}`,
            Angle: `${angle}°`,
          },
        };
      }}
    />
  );
}
