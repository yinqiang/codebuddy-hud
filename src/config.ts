/**
 * CodeBuddy HUD - Configuration Loader
 *
 * Loads and validates user configuration from config.json,
 * merging with defaults for missing/invalid values.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { HudConfig } from './types.js';
import { DEFAULT_CONFIG } from './types.js';

/**
 * Get the config file path.
 * Stored alongside the statusline script in the plugin directory.
 */
export function getConfigPath(): string {
  // Look for config in the plugin directory
  const pluginDir = path.dirname(path.dirname(new URL(import.meta.url).pathname));
  // Normalize Windows path
  const normalized = process.platform === 'win32'
    ? pluginDir.replace(/^\/([A-Z]:)/, '$1')
    : pluginDir;
  return path.join(normalized, 'config.json');
}

/**
 * Load user configuration, merged with defaults.
 */
export async function loadConfig(): Promise<HudConfig> {
  const configPath = getConfigPath();

  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const userConfig = JSON.parse(raw) as Partial<HudConfig>;
    return mergeConfig(userConfig);
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends object ? RecursivePartial<T[P]> : T[P];
};

/**
 * Deep merge user configuration with defaults, validating each field.
 */
export function mergeConfig(userConfig: RecursivePartial<HudConfig>): HudConfig {
  const d = DEFAULT_CONFIG;

  return {
    lineLayout: validateLineLayout(userConfig.lineLayout) ?? d.lineLayout,
    pathLevels: validatePathLevels(userConfig.pathLevels) ?? d.pathLevels,
    maxWidth: validateMaxWidth(userConfig.maxWidth) ?? d.maxWidth,

    gitStatus: {
      enabled: userConfig.gitStatus?.enabled ?? d.gitStatus.enabled,
      showDirty: userConfig.gitStatus?.showDirty ?? d.gitStatus.showDirty,
      showAheadBehind: userConfig.gitStatus?.showAheadBehind ?? d.gitStatus.showAheadBehind,
      showFileStats: userConfig.gitStatus?.showFileStats ?? d.gitStatus.showFileStats,
    },

    display: {
      showModel: userConfig.display?.showModel ?? d.display.showModel,
      showProject: userConfig.display?.showProject ?? d.display.showProject,
      showContextBar: userConfig.display?.showContextBar ?? d.display.showContextBar,
      showDuration: userConfig.display?.showDuration ?? d.display.showDuration,
      showCost: userConfig.display?.showCost ?? d.display.showCost,
      showCodeStats: userConfig.display?.showCodeStats ?? d.display.showCodeStats,
      showVersion: userConfig.display?.showVersion ?? d.display.showVersion,
      showSessionId: userConfig.display?.showSessionId ?? d.display.showSessionId,
      sessionIdLength: userConfig.display?.sessionIdLength ?? d.display.sessionIdLength,
      showToolsLine: userConfig.display?.showToolsLine ?? d.display.showToolsLine,
      showAgentsLine: userConfig.display?.showAgentsLine ?? d.display.showAgentsLine,
      showTodosLine: userConfig.display?.showTodosLine ?? d.display.showTodosLine,
    },

    colors: {
      model: userConfig.colors?.model ?? d.colors.model,
      project: userConfig.colors?.project ?? d.colors.project,
      git: userConfig.colors?.git ?? d.colors.git,
      gitBranch: userConfig.colors?.gitBranch ?? d.colors.gitBranch,
      duration: userConfig.colors?.duration ?? d.colors.duration,
      cost: userConfig.colors?.cost ?? d.colors.cost,
      label: userConfig.colors?.label ?? d.colors.label,
      toolActive: userConfig.colors?.toolActive ?? d.colors.toolActive,
      toolCompleted: userConfig.colors?.toolCompleted ?? d.colors.toolCompleted,
      agentActive: userConfig.colors?.agentActive ?? d.colors.agentActive,
      taskProgress: userConfig.colors?.taskProgress ?? d.colors.taskProgress,
    },
  };
}

// ─── Validation helpers ─────────────────────────────────────────────

function validateLineLayout(value: unknown): 'compact' | 'expanded' | null {
  if (value === 'compact' || value === 'expanded') return value;
  return null;
}

function validatePathLevels(value: unknown): number | null {
  if (typeof value === 'number' && [1, 2, 3].includes(value)) return value;
  return null;
}

function validateMaxWidth(value: unknown): number | null {
  if (value === null) return null;
  if (typeof value === 'number' && value > 0) return value;
  return null;
}
