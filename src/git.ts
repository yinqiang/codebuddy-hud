/**
 * CodeBuddy HUD - Git Status Module
 *
 * Retrieves Git repository status: branch, dirty state,
 * ahead/behind counts, file stats, and line diffs.
 * Results are cached for 3 seconds to avoid redundant exec calls.
 * Git commands run in parallel for performance.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { GitStatus, FileStats, LineDiff } from './types.js';
import { gitCache } from './cache.js';

const execFileAsync = promisify(execFile);

/** Per-command timeout for git operations (ms) */
const GIT_TIMEOUT = 800;

export interface GitOptions {
  showDirty?: boolean;
  showAheadBehind?: boolean;
  showFileStats?: boolean;
}

export async function getGitStatus(cwd?: string, options?: GitOptions): Promise<GitStatus | null> {
  if (!cwd) return null;

  // Check cache
  const cacheKey = `git:${cwd}`;
  const cached = gitCache.get(cacheKey) as GitStatus | undefined;
  if (cached !== undefined) return cached;

  const result = await computeGitStatus(cwd, options);

  // Cache the result (even null, to avoid repeated failed lookups)
  gitCache.set(cacheKey, result);

  return result;
}

async function computeGitStatus(cwd: string, options?: GitOptions): Promise<GitStatus | null> {
  const showDirty = options?.showDirty ?? true;
  const showAheadBehind = options?.showAheadBehind ?? false;
  const showFileStats = options?.showFileStats ?? false;

  try {
    // Run ALL git commands in parallel for maximum performance
    const results = await Promise.all([
      // Branch name
      execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
        cwd, timeout: GIT_TIMEOUT, encoding: 'utf8',
      }).then(({ stdout }) => stdout.trim()).catch(() => null),

      // Dirty check (fast or full depending on config)
      showDirty
        ? (showFileStats
            ? execFileAsync('git', ['--no-optional-locks', 'status', '--porcelain'], {
                cwd, timeout: GIT_TIMEOUT, encoding: 'utf8',
              }).then(({ stdout }) => {
                const trimmed = stdout.trim();
                return { isDirty: trimmed.length > 0, fileStats: trimmed.length > 0 ? parseFileStats(trimmed) : undefined };
              }).catch(() => ({ isDirty: false }))
            : execFileAsync('git', ['diff', '--quiet', 'HEAD'], {
                cwd, timeout: GIT_TIMEOUT, encoding: 'utf8',
              }).then(() => ({ isDirty: false }))
              .catch((err) => {
                const code = err?.code ?? err?.status ?? 1;
                return { isDirty: code === 1 };
              })
        )
        : Promise.resolve(undefined),

      // Ahead/behind
      showAheadBehind
        ? execFileAsync('git', ['rev-list', '--left-right', '--count', '@{upstream}...HEAD'], {
            cwd, timeout: GIT_TIMEOUT, encoding: 'utf8',
          }).then(({ stdout }) => {
            const parts = stdout.trim().split(/\s+/);
            return { ahead: parts.length === 2 ? (parseInt(parts[1], 10) || 0) : 0, behind: parts.length === 2 ? (parseInt(parts[0], 10) || 0) : 0 };
          }).catch(() => ({ ahead: 0, behind: 0 }))
        : Promise.resolve(undefined),
    ]);

    const [branch, dirtyResult, aheadBehindResult] = results;

    if (!branch) return null;

    // Line diffs (depends on dirty, sequential but only for full preset)
    let lineDiff: LineDiff | undefined;
    if (showFileStats && dirtyResult && 'fileStats' in dirtyResult && dirtyResult.isDirty) {
      try {
        const { stdout: numstatOut } = await execFileAsync(
          'git', ['diff', '--numstat', 'HEAD'],
          { cwd, timeout: GIT_TIMEOUT, encoding: 'utf8' },
        );
        lineDiff = parseNumstat(numstatOut, dirtyResult.fileStats);
      } catch {
        // Ignore
      }
    }

    return {
      branch,
      isDirty: dirtyResult && 'isDirty' in dirtyResult ? dirtyResult.isDirty : false,
      ahead: aheadBehindResult ? aheadBehindResult.ahead : 0,
      behind: aheadBehindResult ? aheadBehindResult.behind : 0,
      fileStats: dirtyResult && 'fileStats' in dirtyResult ? dirtyResult.fileStats : undefined,
      lineDiff,
    };
  } catch {
    return null;
  }
}

/**
 * Parse `git status --porcelain` output
 */
function parseFileStats(porcelainOutput: string): FileStats {
  const stats: FileStats = { modified: 0, added: 0, deleted: 0, untracked: 0, trackedFiles: [] };
  const lines = porcelainOutput.split('\n').filter(Boolean);

  for (const line of lines) {
    if (line.length < 2) continue;

    const index = line[0];
    const worktree = line[1];

    if (line.startsWith('??')) {
      stats.untracked++;
    } else if (index === 'A') {
      stats.added++;
      const fullPath = parsePorcelainPath(line.slice(2).trimStart());
      stats.trackedFiles.push({
        basename: fullPath.split('/').pop() ?? fullPath,
        fullPath,
        type: 'added',
      });
    } else if (index === 'D' || worktree === 'D') {
      stats.deleted++;
      const fullPath = parsePorcelainPath(line.slice(2).trimStart());
      stats.trackedFiles.push({
        basename: fullPath.split('/').pop() ?? fullPath,
        fullPath,
        type: 'deleted',
      });
    } else if (index === 'M' || worktree === 'M' || index === 'R' || index === 'C') {
      stats.modified++;
      const fullPath = parsePorcelainPath(
        line.slice(2).trimStart().split(' -> ').pop() ?? line.slice(2).trimStart(),
      );
      stats.trackedFiles.push({
        basename: fullPath.split('/').pop() ?? fullPath,
        fullPath,
        type: 'modified',
      });
    }
  }

  return stats;
}

function parsePorcelainPath(pathField: string): string {
  if (pathField.startsWith('"') && pathField.endsWith('"')) {
    try {
      return JSON.parse(pathField);
    } catch {
      return pathField.slice(1, -1);
    }
  }
  return pathField;
}

/**
 * Parse `git diff --numstat HEAD` output
 */
function parseNumstat(
  numstatOutput: string,
  fileStats?: FileStats,
): LineDiff {
  const totalDiff: LineDiff = { added: 0, deleted: 0 };
  const perFileDiff = new Map<string, LineDiff>();

  for (const line of numstatOutput.trim().split('\n').filter(Boolean)) {
    const parts = line.split('\t');
    if (parts.length < 3) continue;
    const added = parseInt(parts[0], 10);
    const deleted = parseInt(parts[1], 10);
    if (Number.isNaN(added) || Number.isNaN(deleted)) continue;

    const filePath = parts[2];
    totalDiff.added += added;
    totalDiff.deleted += deleted;
    perFileDiff.set(filePath, { added, deleted });
  }

  // Apply line diffs to tracked files
  if (fileStats) {
    for (const file of fileStats.trackedFiles) {
      const diff = perFileDiff.get(file.fullPath);
      if (diff) {
        file.lineDiff = diff;
      }
    }
  }

  return totalDiff;
}
