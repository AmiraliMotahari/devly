'use client';

import { ToolRunner } from '@/components/tool-runner';
import type { ToolComponentProps } from '@/tools/tool-props';
import { convertImage } from './shared';

export function JpgToPng({ tool }: ToolComponentProps) {
  return (
    <ToolRunner
      tool={tool}
      processor={(input, _options, ctx) =>
        convertImage(input as File, 1, 'image/png', 'png', ctx)
      }
    />
  );
}
