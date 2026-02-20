import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import { applyEdit, MorphClient } from '@morphllm/morphsdk';
import { FastApplyPlugin } from './fast-apply-plugin.ts';

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

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

  it('throws [ERROR] Missing MORPH_API_KEY if no env', () => {
    delete process.env.MORPH_API_KEY;
    expect(() => FastApplyPlugin()).toThrow('[ERROR] Missing MORPH_API_KEY');
  });

  it('intercepts "edit" tool via tool.execute.before hook and throws error', async () => {
    const plugin = FastApplyPlugin();

    const beforeHook = plugin?.hooks?.['tool.execute.before'];
    expect(beforeHook).toBeDefined();

    const context = { tool: { name: 'edit' } };

    await expect(beforeHook(context)).rejects.toThrow("Gunakan tool 'fastApply'");
  });

  it('fastApply tool routes to morph-v3-fast for easy tasks', async () => {
    const plugin = FastApplyPlugin();
    const fastApplyTool = plugin?.tools?.find((t: { name: string }) => t.name === 'fastApply');

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

    await fastApplyTool!.execute(args, context);

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
    const plugin = FastApplyPlugin();
    const fastApplyTool = plugin?.tools?.find((t: { name: string }) => t.name === 'fastApply');

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

    await fastApplyTool!.execute(args, context);

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

  it('throws error with prefix [ERROR] if fastApply fails (e.g., file not found)', async () => {
    const plugin = FastApplyPlugin();
    const fastApplyTool = plugin?.tools?.find((t: { name: string }) => t.name === 'fastApply');

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

    await expect(fastApplyTool!.execute(args, context)).rejects.toThrow(/\[ERROR\]/);
  });
});
