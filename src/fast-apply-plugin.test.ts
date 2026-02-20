import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import { applyEdit } from '@morphllm/morphsdk';
import { fastApplyPlugin } from './fast-apply-plugin.ts';

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock('@morphllm/morphsdk', () => ({
  applyEdit: vi.fn(),
}));

describe('fastApplyPlugin', () => {
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
    expect(() => fastApplyPlugin()).toThrow('[ERROR] Missing MORPH_API_KEY');
  });

  it('intercepts "edit" tool via tool.execute.before hook and throws error', async () => {
    const plugin = fastApplyPlugin();

    const beforeHook = plugin?.hooks?.['tool.execute.before'];
    expect(beforeHook).toBeDefined();

    const context = { tool: { name: 'edit' } };

    await expect(beforeHook(context)).rejects.toThrow("Gunakan tool 'fastApply'");
  });

  it('fastApply tool calls readFile, applyEdit, and writeFile correctly', async () => {
    const plugin = fastApplyPlugin();
    const fastApplyTool = plugin?.tools?.find((t: { name: string }) => t.name === 'fastApply');

    expect(fastApplyTool).toBeDefined();

    vi.mocked(fs.readFile).mockResolvedValue('original file content');
    vi.mocked(applyEdit).mockResolvedValue({
      success: true,
      mergedCode: 'modified file content',
      changes: { added: 1, removed: 0, total: 1 },
    } as any);

    const args = {
      filePath: 'test.ts',
      instructions: 'add console.log',
      codeEdit: 'console.log("hello");',
    };

    const context = { directory: '/workspace' };

    await fastApplyTool.execute(args, context);

    expect(fs.readFile).toHaveBeenCalledWith('/workspace/test.ts', 'utf-8');
    expect(applyEdit).toHaveBeenCalledWith({
      code: 'original file content',
      instructions: 'add console.log',
      codeEdit: 'console.log("hello");',
    });
    expect(fs.writeFile).toHaveBeenCalledWith(
      '/workspace/test.ts',
      'modified file content',
      'utf-8'
    );
  });

  it('throws error with prefix [ERROR] if fastApply fails (e.g., file not found)', async () => {
    const plugin = fastApplyPlugin();
    const fastApplyTool = plugin?.tools?.find((t: { name: string }) => t.name === 'fastApply');

    expect(fastApplyTool).toBeDefined();

    vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT: no such file'));

    const args = {
      filePath: 'invalid.ts',
      instructions: 'fail',
      codeEdit: 'fail',
    };

    const context = { directory: '/workspace' };

    await expect(fastApplyTool.execute(args, context)).rejects.toThrow(/\[ERROR\]/);
  });
});
