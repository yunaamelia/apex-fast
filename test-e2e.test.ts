import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyEdit, MorphClient } from '@morphllm/morphsdk';
// Need this to resolve our own plugin correctly since its an entrypoint
import { FastApplyPlugin } from './src/fast-apply-plugin.ts';

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    writeFile: vi.fn(),
    readFile: vi.fn().mockImplementation((path: any, options: any) => {
      if (path.toString().endsWith('dummy.ts')) {
        return Promise.resolve('function dummy() {}\n');
      }
      return actual.readFile(path, options);
    }),
  };
});

vi.mock('@morphllm/morphsdk', () => {
  const classifyMock = vi.fn();
  return {
    applyEdit: vi.fn(),
    MorphClient: vi.fn().mockImplementation(() => ({
      routers: {
        raw: {
          classify: classifyMock,
        },
      },
    })),
  };
});

// Create mock tool wrapper similar to actual tests but closer to integration
vi.mock('@opencode-ai/plugin', async () => {
  const zod = await import('zod');
  const mockToolInner = (config: any) => config;
  mockToolInner.schema = zod.z;
  return {
    tool: mockToolInner,
  };
});

describe('E2E Skill Injection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MORPH_API_KEY = 'test-api-key';
  });

  it('injects relevant skill when instructions mention the skill content', async () => {
    // 1. Initialize plugin with current directory so it picks up .opencode/skills
    const plugin = await FastApplyPlugin({ directory: process.cwd() } as any);
    const fastApplyTool = (plugin as any).tool?.fastApply;

    expect(fastApplyTool).toBeDefined();

    // 2. Setup mock file
    (applyEdit as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      mergedCode: 'function dummy() { console.log("Apex"); }\n',
      changes: { added: 1, removed: 0, total: 1 },
    });

    const mockMorphClient = new MorphClient({ apiKey: 'test' });
    (mockMorphClient.routers.raw.classify as ReturnType<typeof vi.fn>).mockResolvedValue({
      difficulty: 'easy',
    });

    // 3. Define the query that matches our newly created skill "made by apex"
    const args = {
      filePath: 'dummy.ts',
      instructions: 'apex fast test skill',
    };

    const context = { directory: process.cwd() };

    // 4. Force wait a little for SkillRegistry to be initialized
    await new Promise((resolve) => globalThis.setTimeout(resolve, 2000));

    // 5. Execute
    const result = await fastApplyTool.execute(args, context);
    expect(result).toBe('Successfully applied changes to dummy.ts');

    // 6. Assert injection happened
    expect(applyEdit).toHaveBeenCalled();
    const interceptedCall = vi.mocked(applyEdit).mock.calls[0][0] as any;
    expect(interceptedCall.instructions).toContain('SYSTEM: Apply the following skill guidelines');
    expect(interceptedCall.instructions).toContain('name="test-e2e"');
    expect(interceptedCall.instructions).toContain('// Made by Apex-Fast!');
  });
});
