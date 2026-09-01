'use client';

import type { ToolResult, ProcessingContext } from '@/types/tool';
import { replaceExtension } from '@/lib/file-security';

export async function convertImage(
  file: File,
  quality: number,
  outputType: string,
  outputExt: string,
  ctx: ProcessingContext
): Promise<ToolResult> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create canvas context.');

  if (outputType === 'image/jpeg') {
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.drawImage(bitmap, 0, 0);
  bitmap.close();

  ctx.onProgress(60, 'Converting...');

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Conversion failed.'))),
      outputType,
      quality / 100
    );
  });

  ctx.onProgress(90, 'Finalizing...');

  return {
    filename: replaceExtension(file.name, outputExt),
    blob,
    originalSize: file.size,
    outputSize: blob.size,
  };
}
