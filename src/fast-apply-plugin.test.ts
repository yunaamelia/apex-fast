import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import { applyEdit, MorphClient } from '@morphllm/morphsdk';
import { FastApplyPlugin } from './fast-apply-plugin.ts';

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock('@opencode-ai/plugin', async () => {
  const zod = await import('zod');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockToolInner = (config: any) => config;
  mockToolInner.schema = zod.z;
  return {
    tool: mockToolInner,
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

describe('FastApplyPlugin', () => {
  const originalEnv = process.env.MORPH_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MORPH_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    process.env.MORPH_API_KEY = originalEnv;
  });

  it('throws [ERROR] Missing MORPH_API_KEY if no env', async () => {
    delete process.env.MORPH_API_KEY;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(FastApplyPlugin({} as any)).rejects.toThrow('[ERROR] Missing MORPH_API_KEY');
  });

  it('intercepts "edit" tool via tool.execute.before hook and throws error', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plugin = await FastApplyPlugin({} as any);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const beforeHook = (plugin as any)['tool.execute.before'];
    expect(beforeHook).toBeDefined();

    const input = { tool: 'edit' };

    await expect(beforeHook(input, {})).rejects.toThrow("Gunakan tool 'fastApply'");
  });

  it('fastApply tool routes to morph-v3-fast for easy tasks', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plugin = await FastApplyPlugin({ directory: '/workspace' } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fastApplyTool = (plugin as any).tool?.fastApply;

    expect(fastApplyTool).toBeDefined();

    (fs.readFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue('original file content');
    (applyEdit as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      mergedCode: 'modified file content',
      changes: { added: 1, removed: 0, total: 1 },
    });

    const mockMorphClient = new MorphClient({ apiKey: 'test' });
    (mockMorphClient.routers.raw.classify as ReturnType<typeof vi.fn>).mockResolvedValue({
      difficulty: 'easy',
    });

    const args = {
      filePath: 'test.ts',
      instructions: 'add console.log',
      codeEdit: 'console.log("hello");',
    };

    const context = { directory: '/workspace' };

    await fastApplyTool.execute(args, context);

    expect(fs.readFile).toHaveBeenCalledWith('/workspace/test.ts', 'utf-8');
    expect(mockMorphClient.routers.raw.classify).toHaveBeenCalledWith({
      input: 'add console.log',
    });
    expect(applyEdit).toHaveBeenCalledWith({
      originalCode: 'original file content',
      instructions: 'add console.log',
      codeEdit: 'console.log("hello");',
      filepath: '/workspace/test.ts',
      model: 'morph-v3-fast',
    });
    expect(fs.writeFile).toHaveBeenCalledWith(
      '/workspace/test.ts',
      'modified file content',
      'utf-8'
    );
  });

  it('fastApply tool routes to morph-v3-large for hard tasks', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plugin = await FastApplyPlugin({ directory: '/workspace' } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fastApplyTool = (plugin as any).tool?.fastApply;

    expect(fastApplyTool).toBeDefined();

    (fs.readFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      'original file content 2'
    );
    (applyEdit as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      mergedCode: 'modified file content 2',
      changes: { added: 1, removed: 0, total: 1 },
    });

    const mockMorphClient = new MorphClient({ apiKey: 'test' });
    (mockMorphClient.routers.raw.classify as ReturnType<typeof vi.fn>).mockResolvedValue({
      difficulty: 'hard',
    });

    const args = {
      filePath: 'test2.ts',
      instructions: 'refactor entire module',
      codeEdit: 'console.log("world");',
    };

    const context = { directory: '/workspace' };

    await fastApplyTool.execute(args, context);

    expect(mockMorphClient.routers.raw.classify).toHaveBeenCalledWith({
      input: 'refactor entire module',
    });
    expect(applyEdit).toHaveBeenCalledWith({
      originalCode: 'original file content 2',
      instructions: 'refactor entire module',
      codeEdit: 'console.log("world");',
      filepath: '/workspace/test2.ts',
      model: 'morph-v3-large',
    });
  });

  it('throws error if codeEdit lacks markers and original file > 10 lines', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plugin = await FastApplyPlugin({ directory: '/workspace' } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fastApplyTool = (plugin as any).tool?.fastApply;

    // Simulate file > 10 lines
    const longFileContent = Array.from({ length: 15 }, (_, i) => `line ${i}`).join('\n');
    (fs.readFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(longFileContent);

    const args = {
      filePath: 'test3.ts',
      instructions: 'change line 5',
      codeEdit: 'console.log("changed");', // Missing markers
    };

    const context = { directory: '/workspace' };

    await expect(fastApplyTool.execute(args, context)).rejects.toThrow(
      "codeEdit missing '// ... existing code ...' markers for file >10 lines"
    );
  });

  it('allows codeEdit without markers if original file is <= 10 lines', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plugin = await FastApplyPlugin({ directory: '/workspace' } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fastApplyTool = (plugin as any).tool?.fastApply;

    // Simulate file <= 10 lines
    const shortFileContent = Array.from({ length: 5 }, (_, i) => `line ${i}`).join('\n');
    (fs.readFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(shortFileContent);
    (applyEdit as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      mergedCode: 'modified short file',
      changes: { added: 1, removed: 0, total: 1 },
    });

    const mockMorphClient = new MorphClient({ apiKey: 'test' });
    (mockMorphClient.routers.raw.classify as ReturnType<typeof vi.fn>).mockResolvedValue({
      difficulty: 'easy',
    });

    const args = {
      filePath: 'test4.ts',
      instructions: 'change line 2',
      codeEdit: 'console.log("changed target");', // Allowed because small file
    };

    const context = { directory: '/workspace' };

    const result = await fastApplyTool.execute(args, context);
    expect(result).toBe('Successfully applied changes to test4.ts');
  });

  it('throws error if triggered in plan or explore mode', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plugin = await FastApplyPlugin({ directory: '/workspace' } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fastApplyTool = (plugin as any).tool?.fastApply;

    const args = {
      filePath: 'test.ts',
      instructions: 'should fail',
    };

    const contextPlan = { directory: '/workspace', agent: 'plan' };
    const contextExplore = { directory: '/workspace', agent: 'explore' };

    await expect(fastApplyTool.execute(args, contextPlan)).rejects.toThrow(
      '[ERROR] fastApply is not available in plan mode'
    );
    await expect(fastApplyTool.execute(args, contextExplore)).rejects.toThrow(
      '[ERROR] fastApply is not available in explore mode'
    );
  });

  it('throws error with prefix [ERROR] if fastApply fails (e.g., file not found)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plugin = await FastApplyPlugin({ directory: '/workspace' } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fastApplyTool = (plugin as any).tool?.fastApply;

    expect(fastApplyTool).toBeDefined();

    (fs.readFile as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('ENOENT: no such file')
    );

    const mockMorphClient = new MorphClient({ apiKey: 'test' });
    (mockMorphClient.routers.raw.classify as ReturnType<typeof vi.fn>).mockResolvedValue({
      difficulty: 'easy',
    });

    const args = {
      filePath: 'invalid.ts',
      instructions: 'fail',
      codeEdit: 'fail',
    };

    const context = { directory: '/workspace' };

    await expect(fastApplyTool.execute(args, context)).rejects.toThrow(/\[ERROR\]/);
  });
});
