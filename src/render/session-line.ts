/**
 * CodeBuddy HUD - Session Line Renderer
 *
 * Renders the main statusline with model, project, git,
 * duration, cost, and code stats.
 */

import type { RenderContext } from '../types.js';
import {
  getModelName,
  getProjectName,
  getCostUsd,
  getDuration,
  getLinesAdded,
  getLinesRemoved,
  getSessionId,
  getVersion,
} from '../stdin.js';
import {
  model as modelColor,
  project as projectColor,
  git as gitColor,
  gitBranch as gitBranchColor,
  cost as costColor,
  label,
  dim,
  RESET,
  coloredBar,
} from './colors.js';

/**
 * Format milliseconds to human-readable duration string.
 */
export function formatDuration(ms: number): string {
  if (ms <= 0) return '';

  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);

  if (mins < 1) return '<1m';
  if (mins < 60) return `${mins}m`;

  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hours}h ${remainMins}m` : `${hours}h`;
}

/**
 * Format USD cost to compact string.
 */
function formatCost(usd: number): string {
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  if (usd < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}

/**
 * Format line counts.
 */
function formatLines(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

/**
 * Render the main session line for compact layout.
 */
export function renderSessionLine(ctx: RenderContext): string {
  const { stdin, gitStatus, sessionDuration, config } = ctx;
  const display = config.display;
  const colors = config.colors;

  const parts: string[] = [];

  // ── Model badge ───────────────────────────────────────────────
  if (display.showModel) {
    const modelName = getModelName(stdin);
    parts.push(modelColor(`[${modelName}]`, colors));
  }

  // ── Project path ──────────────────────────────────────────────
  if (display.showProject) {
    const projectName = getProjectName(stdin, config.pathLevels);
    parts.push(projectColor(projectName, colors));
  }

  // ── Git status ────────────────────────────────────────────────
  const gitConfig = config.gitStatus;
  if (gitConfig.enabled && gitStatus) {
    const gitParts: string[] = [gitStatus.branch];

    if (gitConfig.showDirty && gitStatus.isDirty) {
      gitParts.push('*');
    }

    if (gitConfig.showAheadBehind) {
      if (gitStatus.ahead > 0) gitParts.push(` ↑${gitStatus.ahead}`);
      if (gitStatus.behind > 0) gitParts.push(` ↓${gitStatus.behind}`);
    }

    if (gitConfig.showFileStats && gitStatus.fileStats) {
      const { modified, added, deleted, untracked } = gitStatus.fileStats;
      const statParts: string[] = [];
      if (modified > 0) statParts.push(`!${modified}`);
      if (added > 0) statParts.push(`+${added}`);
      if (deleted > 0) statParts.push(`✘${deleted}`);
      if (untracked > 0) statParts.push(`?${untracked}`);
      if (statParts.length > 0) {
        gitParts.push(` ${statParts.join(' ')}`);
      }
    }

    const gitStr = gitParts.join('');
    parts.push(`${gitColor('git:(', colors)}${gitBranchColor(gitStr, colors)}${gitColor(')', colors)}`);
  }

  // ── Duration ──────────────────────────────────────────────────
  if (display.showDuration && sessionDuration) {
    parts.push(label(`⏱ ${sessionDuration}`, colors));
  }

  // ── Cost ──────────────────────────────────────────────────────
  if (display.showCost) {
    const costUsd = getCostUsd(stdin);
    if (costUsd !== null) {
      parts.push(costColor(`💰 ${formatCost(costUsd)}`, colors));
    }
  }

  // ── Code stats ────────────────────────────────────────────────
  if (display.showCodeStats) {
    const added = getLinesAdded(stdin);
    const removed = getLinesRemoved(stdin);
    if (added > 0 || removed > 0) {
      const statsParts: string[] = [];
      if (added > 0) statsParts.push(`+${formatLines(added)}`);
      if (removed > 0) statsParts.push(`-${formatLines(removed)}`);
      if (statsParts.length > 0) {
        parts.push(label(statsParts.join(' '), colors));
      }
    }
  }

  // ── Version ───────────────────────────────────────────────────
  if (display.showVersion) {
    const ver = getVersion(stdin);
    if (ver) {
      parts.push(label(`v${ver}`, colors));
    }
  }

  // ── Session ID ────────────────────────────────────────────────
  if (display.showSessionId) {
    const sid = getSessionId(stdin, display.sessionIdLength);
    if (sid) {
      parts.push(dim(`#${sid}`));
    }
  }

  return parts.join(' │ ');
}
