/**
 * SkillFs - Abstract filesystem access for skills
 *
 * This module encapsulates all filesystem operations related to skill discovery and loading.
 * It provides a mockable interface that works across different Node.js implementations,
 * enabling unit tests to stub filesystem operations without complex mocking libraries.
 *
 * Each function is designed as a pure export to be easily replaced in test environments
 * (e.g., via mocking FS access in test suites).
 */

import * as fs from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import mime from 'mime';

export const readSkillFile = async (path: string): Promise<string> => {
  return fs.readFile(path, 'utf8');
};

/**
 * List all files in a skill subdirectory (e.g., scripts/, resources/)
 * Returns a flat array of absolute file paths
 */
export const listSkillFiles = async (
  skillPath: string,
  subdirectory: string
): Promise<string[]> => {
  const dirPath = join(skillPath, subdirectory);
  if (!existsSync(dirPath)) {
    return [];
  }

  const entries = await fs.readdir(dirPath, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath || dirPath, entry.name));
};

export const findSkillPaths = async (basePath: string): Promise<string[]> => {
  if (!existsSync(basePath)) {
    return [];
  }

  const entries = await fs.readdir(basePath, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name === 'SKILL.md')
    .map((entry) => join(entry.parentPath || basePath, entry.name));
};

// purely so we can mock it in tests
export const doesPathExist = (path: string): boolean => {
  return existsSync(path);
};

/**
 * Detect MIME type from file extension
 * Used for skill resources to identify content type
 *
 * @param filePath - Path to the file
 * @returns MIME type string
 */
export const detectMimeType = (filePath: string): string => {
  return mime.getType(filePath) || 'application/octet-stream';
};
