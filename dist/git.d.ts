/**
 * CodeBuddy HUD - Git Status Module
 *
 * Retrieves Git repository status: branch, dirty state,
 * ahead/behind counts, file stats, and line diffs.
 * Results are cached for 3 seconds to avoid redundant exec calls.
 * Git commands run in parallel for performance.
 */
import type { GitStatus } from './types.js';
export interface GitOptions {
    showDirty?: boolean;
    showAheadBehind?: boolean;
    showFileStats?: boolean;
}
export declare function getGitStatus(cwd?: string, options?: GitOptions): Promise<GitStatus | null>;
//# sourceMappingURL=git.d.ts.map