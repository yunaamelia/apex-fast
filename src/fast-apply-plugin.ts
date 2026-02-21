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
          // eslint-disable-next-line no-console
          console.log(`[DEBUG] fastApply called for file: ${args.filePath}`);
          // Block usage in readonly agents (plan, explore)
          const READONLY_AGENTS = ['plan', 'explore'];

          if (
            context &&
            (context as any).agent &&
            READONLY_AGENTS.includes((context as any).agent)
          ) {
            throw new Error(
              `[ERROR] fastApply is not available in ${(context as any).agent} mode. Please switch to a build/code mode.`
            );
          }

          // Fallback to context.directory if ctx.directory is somehow missing (in tests perhaps)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const directory = ctx?.directory || (context as any)?.directory || process.cwd();
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
            // First run preflight validation: protect against catastrophic deletion
            if (args.codeEdit) {
              const lines = originalCode.split('\n');
              const isLargeFile = lines.length > 10;
              const hasMarkers = args.codeEdit.includes('... existing code ...');

              if (isLargeFile && !hasMarkers) {
                // Return descriptive error telling AI to wrap changes
                throw new Error(
                  "[ERROR] codeEdit missing '// ... existing code ...' markers for file >10 lines. This prevents catastrophic deletion. Please wrap partial edits with markers."
                );
              }
            }

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
    'tool.execute.after': async (input, output) => {
      if (input.tool === 'fastApply') {
        const fileMatch = output.output.match(/Successfully applied changes to (.+)/);

        if (fileMatch) {
          output.title = `Morph: applied changes to ${fileMatch[1]}`;
        }

        output.metadata = {
          ...output.metadata,
          provider: 'morph',
        };
      }
    },
  };
};
