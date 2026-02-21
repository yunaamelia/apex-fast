import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { type Plugin, tool } from '@opencode-ai/plugin';
import { applyEdit, MorphClient } from '@morphllm/morphsdk';
import { createSkillRegistry } from './skills/services/SkillRegistry';
import { createLogger } from './skills/services/logger';
import { PluginConfig } from './skills/types';
import { homedir } from 'node:os';

export const FastApplyPlugin: Plugin = async (ctx) => {
  if (!process.env.MORPH_API_KEY) {
    throw new Error('[ERROR] Missing MORPH_API_KEY');
  }
  const morph = new MorphClient({ apiKey: process.env.MORPH_API_KEY });

  // Initialize SkillRegistry
  const config: PluginConfig = {
    debug: false,
    basePaths: [
      path.join(ctx.directory || process.cwd(), 'skills'),
      path.join(ctx.directory || process.cwd(), '.agent/skills'),
      path.join(ctx.directory || process.cwd(), '.opencode/skills'),
      path.join(homedir(), '.config/opencode/skills'),
      path.join(homedir(), '.opencode/skills'),
    ],
    promptRenderer: 'xml', // default
  };
  const logger = createLogger(config);
  const registry = await createSkillRegistry(config, logger);

  // We trigger initialization, but we don't block plugin setup.
  // We'll await `whenReady()` inside the tool execution.
  registry.initialise();

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

            // Await skill registry
            await registry.controller.ready.whenReady();

            // Look for matching skills
            let enrichedInstructions = args.instructions;
            let activeSkillsStr = '';

            // We use the instructions text to run a free text search against the registry
            const skillSearchResults = registry.search(args.instructions);

            // Only inject if we have matches. Take the top 1 or 2 to avoid blowing up prompt size.
            // A realistic threshold: if a phrase matches well then let's use it.
            if (skillSearchResults.matches.length > 0) {
              const topSkills = skillSearchResults.matches.slice(0, 2);
              const skillTexts = topSkills.map(
                (s) =>
                  `<Skill name="${s.name}" description="${s.description}">\n${s.content}\n</Skill>`
              );
              activeSkillsStr = skillTexts.join('\n\n');
              enrichedInstructions = `${args.instructions}\n\n[SYSTEM: Apply the following skill guidelines when making edits:]\n${activeSkillsStr}`;
              logger.debug(
                `[FastApply] Injected ${topSkills.length} skills into morph instructions`
              );
            }

            // Check difficulty to route to the correct apply model
            const { difficulty } = await morph.routers.raw.classify({
              input: args.instructions,
            });
            const selectedModel = difficulty === 'hard' ? 'morph-v3-large' : 'morph-v3-fast';

            result = await applyEdit({
              originalCode,
              instructions: enrichedInstructions,
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
