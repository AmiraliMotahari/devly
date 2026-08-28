'use client';

import { ToolRunner } from '@/components/tool-runner';
import type { ToolComponentProps } from '@/tools/tool-props';
import type { ToolResult } from '@/types/tool';

interface ICONDIRENTRY {
  width: number;
  height: number;
  colors: number;
  planes: number;
  bpp: number;
  size: number;
  offset: number;
}

function createIcon(images: { width: number; height: number; data: Uint8Array }[]): Blob {
  const numImages = images.length;
  const headerSize = 6;
  const entrySize = 16;
  const directorySize = headerSize + numImages * entrySize;

  let dataOffset = directorySize;
  const entries: ICONDIRENTRY[] = [];

  for (const img of images) {
    entries.push({
      width: img.width >= 256 ? 0 : img.width,
      height: img.height >= 256 ? 0 : img.height,
      colors: 0,
      planes: 1,
      bpp: 32,
      size: 40 + img.data.length,
      offset: dataOffset,
    });
    dataOffset += 40 + img.data.length;
  }

  const totalSize = dataOffset;
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const uint8 = new Uint8Array(buffer);

  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, numImages, true);

  let offset = headerSize;
  for (const entry of entries) {
    view.setUint8(offset, entry.width);
    view.setUint8(offset + 1, entry.height);
    view.setUint8(offset + 2, entry.colors);
    view.setUint8(offset + 3, 0);
    view.setUint16(offset + 4, entry.planes, true);
    view.setUint16(offset + 6, entry.bpp, true);
    view.setUint32(offset + 8, entry.size, true);
    view.setUint32(offset + 12, entry.offset, true);
    offset += entrySize;
  }

  for (let i = 0; i < images.length; i++) {
    const img = images[i];

    view.setUint32(offset, 40, true);
    view.setUint32(offset + 4, img.width, true);
    view.setUint32(offset + 8, img.height * 2, true);
    view.setUint16(offset + 12, 1, true);
    view.setUint16(offset + 14, 32, true);
    view.setUint32(offset + 16, 0, true);
    view.setUint32(offset + 20, img.data.length, true);
    view.setUint32(offset + 24, 0, true);
    view.setUint32(offset + 28, 0, true);
    view.setUint32(offset + 32, 0, true);
    view.setUint32(offset + 36, 0, true);

    offset += 40;

    for (let y = img.height - 1; y >= 0; y--) {
      for (let x = 0; x < img.width; x++) {
        const srcIdx = (y * img.width + x) * 4;
        uint8[offset++] = img.data[srcIdx + 2];
        uint8[offset++] = img.data[srcIdx + 1];
        uint8[offset++] = img.data[srcIdx];
        uint8[offset++] = img.data[srcIdx + 3];
      }
    }
  }

  return new Blob([buffer], { type: 'image/x-icon' });
}

export function FaviconGenerator({ tool }: ToolComponentProps) {
  return (
    <ToolRunner
      tool={tool}
      processor={async (input, options, ctx): Promise<ToolResult> => {
        const file = input as File;
        const sizeMode = String(options.sizes);

        const sizes = sizeMode === 'all'
          ? [16, 32, 48, 256]
          : sizeMode === 'standard'
          ? [16, 32, 48]
          : [32, 48, 256];

        const bitmap = await createImageBitmap(file);
        const images: { width: number; height: number; data: Uint8Array }[] = [];

        for (let i = 0; i < sizes.length; i++) {
          const size = sizes[i];
          ctx.onProgress(
            Math.round((i / sizes.length) * 70),
            `Generating ${size}x${size}...`,
          );

          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Could not create canvas context.');

          context.imageSmoothingQuality = 'high';
          context.drawImage(bitmap, 0, 0, size, size);

          const imageData = context.getImageData(0, 0, size, size);
          images.push({
            width: size,
            height: size,
            data: new Uint8Array(imageData.data.buffer),
          });
        }

        bitmap.close();

        ctx.onProgress(80, 'Creating ICO file...');

        const icoBlob = createIcon(images);

        ctx.onProgress(95, 'Finalizing...');

        return {
          filename: 'favicon.ico',
          blob: icoBlob,
          originalSize: file.size,
          outputSize: icoBlob.size,
          metadata: {
            'Sizes included': sizes.map((s) => `${s}x${s}`).join(', '),
          },
        };
      }}
    />
  );
}
