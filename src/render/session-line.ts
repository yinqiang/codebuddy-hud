/**
 * CodeBuddy HUD - Session Line Renderer
 *
 * Renders the main statusline with model, project, git,
 * duration, cost, and code stats.
 * Supports compact (single-line) and expanded (multi-line) layouts.
 */

import type { RenderContext } from '../types.js';
import {
  getModelName,
  getProjectName,
  getCostUsd,
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
  bold,
} from './colors.js';
import { getStrings, t } from '../i18n.js';

/**
 * Format milliseconds to human-readable duration string.
 */
export function formatDuration(ms: number, lang: 'en' | 'zh' = 'en'): string {
  if (ms <= 0) return '';

  const s = getStrings(lang);
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);

  if (mins < 1) return s.lessThanMinute;
  if (mins < 60) return `${mins}${s.minute}`;

  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hours}${s.hour} ${remainMins}${s.minute}` : `${hours}${s.hour}`;
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
  const { config } = ctx;
  if (config.lineLayout === 'expanded') {
    return renderExpandedSessionLine(ctx);
  }
  return renderCompactSessionLine(ctx);
}

/**
 * Compact layout: single line, pipe-separated.
 */
function renderCompactSessionLine(ctx: RenderContext): string {
  const { stdin, gitStatus, sessionDuration, config } = ctx;
  const display = config.display;
  const colors = config.colors;
  const s = getStrings(config.language);

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
      gitParts.push(s.gitDirty);
    }

    if (gitConfig.showAheadBehind) {
      if (gitStatus.ahead > 0) gitParts.push(` ${s.gitAhead}${gitStatus.ahead}`);
      if (gitStatus.behind > 0) gitParts.push(` ${s.gitBehind}${gitStatus.behind}`);
    }

    if (gitConfig.showFileStats && gitStatus.fileStats) {
      const { modified, added, deleted, untracked } = gitStatus.fileStats;
      const statParts: string[] = [];
      if (modified > 0) statParts.push(`${s.modified}${modified}`);
      if (added > 0) statParts.push(`${s.added}${added}`);
      if (deleted > 0) statParts.push(`${s.deleted}${deleted}`);
      if (untracked > 0) statParts.push(`${s.untracked}${untracked}`);
      if (statParts.length > 0) {
        gitParts.push(` ${statParts.join(' ')}`);
      }
    }

    const gitStr = gitParts.join('');
    parts.push(`${gitColor(`${s.git}:(`, colors)}${gitBranchColor(gitStr, colors)}${gitColor(')', colors)}`);
  }

  // ── Duration ──────────────────────────────────────────────────
  if (display.showDuration && sessionDuration) {
    parts.push(label(`${s.duration} ${sessionDuration}`, colors));
  }

  // ── Cost ──────────────────────────────────────────────────────
  if (display.showCost) {
    const costUsd = getCostUsd(stdin);
    if (costUsd !== null) {
      parts.push(costColor(`${s.cost} ${formatCost(costUsd)}`, colors));
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
      parts.push(label(`${s.version}${ver}`, colors));
    }
  }

  // ── Session ID ────────────────────────────────────────────────
  if (display.showSessionId) {
    const sid = getSessionId(stdin, display.sessionIdLength);
    if (sid) {
      parts.push(dim(`${s.session}${sid}`));
    }
  }

  return parts.join(' │ ');
}

/**
 * Expanded layout: each section on its own line with labeled prefix.
 */
function renderExpandedSessionLine(ctx: RenderContext): string {
  const { stdin, gitStatus, sessionDuration, config } = ctx;
  const display = config.display;
  const colors = config.colors;
  const s = getStrings(config.language);

  const lines: string[] = [];

  // ── Model + Project (line 1) ──────────────────────────────────
  if (display.showModel || display.showProject) {
    const parts: string[] = [];
    if (display.showModel) {
      const modelName = getModelName(stdin);
      parts.push(modelColor(`[${modelName}]`, colors));
    }
    if (display.showProject) {
      const projectName = getProjectName(stdin, config.pathLevels);
      parts.push(projectColor(projectName, colors));
    }
    lines.push(parts.join(' '));
  }

  // ── Git (line 2) ──────────────────────────────────────────────
  const gitConfig = config.gitStatus;
  if (gitConfig.enabled && gitStatus) {
    const gitParts: string[] = [gitStatus.branch];
    if (gitConfig.showDirty && gitStatus.isDirty) gitParts.push(s.gitDirty);
    if (gitConfig.showAheadBehind) {
      if (gitStatus.ahead > 0) gitParts.push(`${s.gitAhead}${gitStatus.ahead}`);
      if (gitStatus.behind > 0) gitParts.push(`${s.gitBehind}${gitStatus.behind}`);
    }
    const gitStr = gitParts.join(' ');
    lines.push(
      dim(`${s.git}: `) + gitBranchColor(gitStr, colors)
    );
  }

  // ── Duration (line 3) ─────────────────────────────────────────
  if (display.showDuration && sessionDuration) {
    lines.push(
      dim(`${s.duration} `) + label(sessionDuration, colors)
    );
  }

  // ── Cost (line 4) ─────────────────────────────────────────────
  if (display.showCost) {
    const costUsd = getCostUsd(stdin);
    if (costUsd !== null) {
      lines.push(
        dim(`${s.cost} `) + costColor(formatCost(costUsd), colors)
      );
    }
  }

  // ── Code stats (line 5) ───────────────────────────────────────
  if (display.showCodeStats) {
    const added = getLinesAdded(stdin);
    const removed = getLinesRemoved(stdin);
    if (added > 0 || removed > 0) {
      const statsParts: string[] = [];
      if (added > 0) statsParts.push(`+${formatLines(added)}`);
      if (removed > 0) statsParts.push(`-${formatLines(removed)}`);
      if (statsParts.length > 0) {
        lines.push(dim(`± `) + label(statsParts.join(' '), colors));
      }
    }
  }

  return lines.join('\n');
}
