'use client';

import { ToolRunner } from '@/components/tool-runner';
import type { ToolComponentProps } from '@/tools/tool-props';
import type { ToolResult } from '@/types/tool';

export function CropImage({ tool }: ToolComponentProps) {
  return (
    <ToolRunner
      tool={tool}
      processor={async (input, options, ctx): Promise<ToolResult> => {
        const file = input as File;
        const left = Math.max(0, Number(options.left) || 0);
        const top = Math.max(0, Number(options.top) || 0);
        const width = Number(options.width);
        const height = Number(options.height);
        const square = Boolean(options.square);

        const bitmap = await createImageBitmap(file);
        const imgW = bitmap.width;
        const imgH = bitmap.height;

        if (width <= 0 || height <= 0) {
          bitmap.close();
          throw new Error('Width and height must be positive numbers.');
        }
        if (left + width > imgW || top + height > imgH) {
          bitmap.close();
          throw new Error(
            `Crop area (${left},${top} ${width}×${height}) exceeds image dimensions (${imgW}×${imgH}).`,
          );
        }

        // Square mode: grow the smaller dimension, centered on the crop area
        let cropX = left;
        let cropY = top;
        let cropW = width;
        let cropH = height;
        if (square) {
          const side = Math.max(width, height);
          cropW = side;
          cropH = side;
          cropX = left - Math.floor((side - width) / 2);
          cropY = top - Math.floor((side - height) / 2);
          // Clamp into image bounds
          if (cropX < 0) cropX = 0;
          if (cropY < 0) cropY = 0;
          if (cropX + side > imgW) cropX = imgW - side;
          if (cropY + side > imgH) cropY = imgH - side;
        }

        const canvas = document.createElement('canvas');
        canvas.width = cropW;
        canvas.height = cropH;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not create canvas context.');

        context.imageSmoothingQuality = 'high';
        context.drawImage(
          bitmap,
          cropX,
          cropY,
          cropW,
          cropH,
          0,
          0,
          cropW,
          cropH,
        );
        bitmap.close();

        ctx.onProgress(70, 'Cropping...');

        const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
        const outputType =
          ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('Crop failed.'))),
            outputType,
            0.92,
          );
        });

        ctx.onProgress(90, 'Finalizing...');

        return {
          filename: file.name.replace(/(\.[^.]+)?$/, '') + '-cropped.' + (ext === 'jpeg' ? 'jpg' : ext),
          blob,
          originalSize: file.size,
          outputSize: blob.size,
          metadata: {
            'Crop area': `${cropX},${cropY} ${cropW}×${cropH}`,
          },
        };
      }}
    />
  );
}
