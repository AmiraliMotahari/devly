'use client';

import { ToolRunner } from '@/components/tool-runner';
import type { ToolComponentProps } from '@/tools/tool-props';
import type { ToolResult, ProcessingContext } from '@/types/tool';
import { replaceExtension, getExtension } from '@/lib/file-security';

export function CompressImage({ tool }: ToolComponentProps) {
  return (
    <ToolRunner
      tool={tool}
      processor={async (input, options, ctx): Promise<ToolResult> => {
        const file = input as File;
        const quality = Number(options.quality) / 100;
        const ext = getExtension(file.name);

        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not create canvas context.');

        if (ext === 'jpg' || ext === 'jpeg') {
          context.fillStyle = 'white';
          context.fillRect(0, 0, canvas.width, canvas.height);
        }
        context.drawImage(bitmap, 0, 0);
        bitmap.close();

        ctx.onProgress(60, 'Compressing...');

        let outputType: string;
        let outputExt: string;
        if (ext === 'png') {
          outputType = 'image/png';
          outputExt = 'png';
        } else if (ext === 'webp') {
          outputType = 'image/webp';
          outputExt = 'webp';
        } else {
          outputType = 'image/jpeg';
          outputExt = ext === 'jpeg' ? 'jpeg' : 'jpg';
        }

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('Compression failed.'))),
            outputType,
            outputType === 'image/png' ? undefined : quality
          );
        });

        ctx.onProgress(90, 'Finalizing...');

        return {
          filename: replaceExtension(file.name, outputExt),
          blob,
          originalSize: file.size,
          outputSize: blob.size,
        };
      }}
    />
  );
}
