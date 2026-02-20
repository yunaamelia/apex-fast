import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { type Plugin, tool } from '@opencode-ai/plugin';
import { applyEdit, MorphClient } from '@morphllm/morphsdk';

export const FastApplyPlugin: Plugin = async (ctx) => {
  if (!process.env.MORPH_API_KEY) {
    throw new Error('[ERROR] Missing MORPH_API_KEY');
  }
  const morph = new MorphClient({ apiKey: process.env.MORPH_API_KEY });

  return {
    'tool.execute.before': async (input) => {
      if (input.tool === 'edit') {
        throw new Error("[ERROR] Gunakan tool 'fastApply' untuk mengedit file agar lebih cepat.");
      }
    },
    tool: {
      fastApply: tool({
        description: 'Edit file content using fast apply',
        args: {
          filePath: tool.schema.string().describe('Relative path to the file to edit'),
          instructions: tool.schema.string().describe('Clear instructions on what to change'),
          codeEdit: tool.schema
            .string()
            .optional()
            .describe('The specific code snippet to edit (optional)'),
        },
        execute: async (args, context) => {
          // Fallback to context.directory if ctx.directory is somehow missing (in tests perhaps)
          const directory = ctx?.directory || context?.directory || process.cwd();
          const absolutePath = path.join(directory, args.filePath);
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
            // Check difficulty to route to the correct apply model
            const { difficulty } = await morph.routers.raw.classify({
              input: args.instructions,
            });
            const selectedModel = difficulty === 'hard' ? 'morph-v3-large' : 'morph-v3-fast';

            result = await applyEdit({
              originalCode,
              instructions: args.instructions,
              codeEdit: args.codeEdit || '',
              filepath: absolutePath,
              model: selectedModel,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any); // using as any to safely inject model into ApplyEditInput
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
            return `Successfully applied changes to ${args.filePath}`;
          } catch (error: unknown) {
            if (error instanceof Error) {
              throw new Error(`[ERROR] Failed to write file: ${error.message}`);
            }
            throw new Error(`[ERROR] Failed to write file`);
          }
        },
      }),
    },
  };
};
