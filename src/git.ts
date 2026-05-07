/**
 * CodeBuddy HUD - Git Status Module
 *
 * Retrieves Git repository status: branch, dirty state,
 * ahead/behind counts, file stats, and line diffs.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { GitStatus, FileStats, LineDiff, TrackedFile } from './types.js';

const execFileAsync = promisify(execFile);

export async function getGitStatus(cwd?: string): Promise<GitStatus | null> {
  if (!cwd) return null;

  try {
    // 1. Get branch name
    const { stdout: branchOut } = await execFileAsync(
      'git',
      ['rev-parse', '--abbrev-ref', 'HEAD'],
      { cwd, timeout: 1000, encoding: 'utf8' },
    );
    const branch = branchOut.trim();
    if (!branch) return null;

    // 2. Check dirty state and file stats
    let isDirty = false;
    let fileStats: FileStats | undefined;

    try {
      const { stdout: statusOut } = await execFileAsync(
        'git',
        ['--no-optional-locks', 'status', '--porcelain'],
        { cwd, timeout: 1000, encoding: 'utf8' },
      );
      const trimmed = statusOut.trim();
      isDirty = trimmed.length > 0;
      if (isDirty) {
        fileStats = parseFileStats(trimmed);
      }
    } catch {
      // Assume clean on error
    }

    // 3. Get line diffs
    let lineDiff: LineDiff | undefined;
    if (isDirty) {
      try {
        const { stdout: numstatOut } = await execFileAsync(
          'git',
          ['diff', '--numstat', 'HEAD'],
          { cwd, timeout: 2000, encoding: 'utf8' },
        );
        const trackedPaths = new Set(fileStats?.trackedFiles.map(f => f.fullPath) ?? []);
        lineDiff = parseNumstat(numstatOut, trackedPaths, fileStats);
      } catch {
        // Ignore
      }
    }

    // 4. Get ahead/behind counts
    let ahead = 0;
    let behind = 0;
    try {
      const { stdout: revOut } = await execFileAsync(
        'git',
        ['rev-list', '--left-right', '--count', '@{upstream}...HEAD'],
        { cwd, timeout: 1000, encoding: 'utf8' },
      );
      const parts = revOut.trim().split(/\s+/);
      if (parts.length === 2) {
        behind = parseInt(parts[0], 10) || 0;
        ahead = parseInt(parts[1], 10) || 0;
      }
    } catch {
      // No upstream or error
    }

    return { branch, isDirty, ahead, behind, fileStats, lineDiff };
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
  trackedPaths: Set<string>,
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
