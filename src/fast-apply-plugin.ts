import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { z } from 'zod';
import { applyEdit } from '@morphllm/morphsdk';

export function fastApplyPlugin() {
  if (!process.env.MORPH_API_KEY) {
    throw new Error('[ERROR] Missing MORPH_API_KEY');
  }

  return {
    hooks: {
      'tool.execute.before': async (context: unknown) => {
        const ctx = context as { tool?: { name?: string } | string };
        const toolName = typeof ctx?.tool === 'string' ? ctx.tool : ctx?.tool?.name;
        if (toolName === 'edit') {
          throw new Error("[ERROR] Gunakan tool 'fastApply' untuk mengedit file agar lebih cepat.");
        }
      },
    },
    tools: [
      {
        name: 'fastApply',
        description: 'Edit file content using fast apply',
        schema: z.object({
          filePath: z.string(),
          instructions: z.string(),
          codeEdit: z.string(),
        }),
        execute: async (
          args: { filePath: string; instructions: string; codeEdit: string },
          context: unknown
        ) => {
          const ctx = context as { directory: string };
          const absolutePath = path.join(ctx.directory, args.filePath);
          let originalCode: string;

          try {
            originalCode = await fs.readFile(absolutePath, 'utf-8');
          } catch (error: unknown) {
            if (error instanceof Error) {
              throw new Error(`[ERROR] Failed to read file: ${error.message}`);
            }
            throw new Error(`[ERROR] Failed to read file`);
          }

          let result;
          try {
            result = await applyEdit({
              originalCode,
              instructions: args.instructions,
              codeEdit: args.codeEdit,
              filepath: absolutePath,
            });
          } catch (error: unknown) {
            if (error instanceof Error) {
              throw new Error(`[ERROR] Failed to apply edit: ${error.message}`);
            }
            throw new Error(`[ERROR] Failed to apply edit`);
          }

          if (!result || !result.success || !result.mergedCode) {
            throw new Error(`[ERROR] applyEdit failed`);
          }

          try {
            await fs.writeFile(absolutePath, result.mergedCode, 'utf-8');
          } catch (error: unknown) {
            if (error instanceof Error) {
              throw new Error(`[ERROR] Failed to write file: ${error.message}`);
            }
            throw new Error(`[ERROR] Failed to write file`);
          }
        },
      },
    ],
  };
}
