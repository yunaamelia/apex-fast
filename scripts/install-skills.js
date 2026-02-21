import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

async function installSkills() {
    const sourceDir = path.resolve(process.cwd(), 'skills');
    const targetDir = path.join(os.homedir(), '.config', 'opencode', 'skills');

    try {
        const stats = await fs.stat(sourceDir);
        if (!stats.isDirectory()) {
            return;
        }
    } catch {
        console.log('[apex-fast] No source skills directory found to install.');
        return;
    }

    try {
        console.log(`[apex-fast] Installing skills to ${targetDir}...`);
        // Create target dir if it doesn't exist
        await fs.mkdir(targetDir, { recursive: true });

        // Node.js fs.cp handles recursive copying and overwrites by default with force: true
        await fs.cp(sourceDir, targetDir, { recursive: true, force: true });
        console.log(`[apex-fast] Skills successfully merged into ${targetDir}`);
    } catch (err) {
        if (err instanceof Error) {
            console.error(`[apex-fast] Failed to install skills: ${err.message}`);
        } else {
            console.error(`[apex-fast] Failed to install skills`);
        }
    }
}

installSkills();
