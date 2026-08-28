'use client';

import { ToolRunner } from '@/components/tool-runner';
import type { ToolComponentProps } from '@/tools/tool-props';
import type { ToolResult } from '@/types/tool';
import { getExtension } from '@/lib/file-security';

const PLATFORM_SIZES: Record<string, { width: number; height: number; name: string }> = {
  'instagram-post': { width: 1080, height: 1080, name: 'Instagram Post' },
  'instagram-story': { width: 1080, height: 1920, name: 'Instagram Story' },
  'instagram-profile': { width: 320, height: 320, name: 'Instagram Profile' },
  'facebook-post': { width: 1200, height: 630, name: 'Facebook Post' },
  'facebook-cover': { width: 820, height: 312, name: 'Facebook Cover' },
  'twitter-post': { width: 1200, height: 675, name: 'Twitter Post' },
  'twitter-header': { width: 1500, height: 500, name: 'Twitter Header' },
  'linkedin-post': { width: 1200, height: 627, name: 'LinkedIn Post' },
  'linkedin-banner': { width: 1584, height: 396, name: 'LinkedIn Banner' },
  'youtube-thumbnail': { width: 1280, height: 720, name: 'YouTube Thumbnail' },
  'youtube-channel': { width: 2560, height: 1440, name: 'YouTube Channel Art' },
  'pinterest-pin': { width: 1000, height: 1500, name: 'Pinterest Pin' },
};

export function SocialImageOptimizer({ tool }: ToolComponentProps) {
  return (
    <ToolRunner
      tool={tool}
      processor={async (input, options, ctx): Promise<ToolResult> => {
        const file = input as File;
        const platform = String(options.platform);
        const maintainAspect = Boolean(options.maintainAspect);

        const size = PLATFORM_SIZES[platform] || PLATFORM_SIZES['instagram-post'];

        const bitmap = await createImageBitmap(file);
        const originalWidth = bitmap.width;
        const originalHeight = bitmap.height;

        const targetWidth = size.width;
        const targetHeight = size.height;
        let drawX = 0;
        let drawY = 0;
        let drawWidth = size.width;
        let drawHeight = size.height;

        if (maintainAspect) {
          const sourceRatio = originalWidth / originalHeight;
          const targetRatio = size.width / size.height;

          if (sourceRatio > targetRatio) {
            drawHeight = Math.round(size.width / sourceRatio);
            drawY = Math.round((size.height - drawHeight) / 2);
          } else {
            drawWidth = Math.round(size.height * sourceRatio);
            drawX = Math.round((size.width - drawWidth) / 2);
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not create canvas context.');

        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, targetWidth, targetHeight);
        context.imageSmoothingQuality = 'high';
        context.drawImage(bitmap, drawX, drawY, drawWidth, drawHeight);
        bitmap.close();

        ctx.onProgress(70, 'Optimizing...');

        const ext = getExtension(file.name);
        const outputExt = ext === 'png' || ext === 'webp' ? ext : 'jpg';
        const outputType =
          outputExt === 'png' ? 'image/png' : outputExt === 'webp' ? 'image/webp' : 'image/jpeg';

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('Optimization failed.'))),
            outputType,
            0.92,
          );
        });

        ctx.onProgress(95, 'Finalizing...');

        const baseName = file.name.replace(/\.[^/.]+$/, '');
        return {
          filename: `${baseName}-${platform}.${outputExt}`,
          blob,
          originalSize: file.size,
          outputSize: blob.size,
          metadata: {
            Platform: size.name,
            'Original dimensions': `${originalWidth} × ${originalHeight}`,
            'Target dimensions': `${targetWidth} × ${targetHeight}`,
            'Maintain aspect': maintainAspect ? 'Yes' : 'No',
          },
        };
      }}
    />
  );
}
