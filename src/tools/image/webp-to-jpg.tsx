'use client';

import { ToolRunner } from '@/components/tool-runner';
import type { ToolComponentProps } from '@/tools/tool-props';
import { convertImage } from './shared';

export function WebpToJpg({ tool }: ToolComponentProps) {
  return (
    <ToolRunner
      tool={tool}
      processor={(input, options, ctx) =>
        convertImage(input as File, Number(options.quality), 'image/jpeg', 'jpg', ctx)
      }
    />
  );
}
