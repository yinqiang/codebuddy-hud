/**
 * CodeBuddy HUD - Configuration Loader
 *
 * Loads and validates user configuration from config.json,
 * merging with defaults for missing/invalid values.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
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

/**
 * Merge user configuration with defaults, validating each field.
 */
export function mergeConfig(userConfig: Record<string, unknown>): HudConfig {
  const config: HudConfig = {
    lineLayout: validateLineLayout(userConfig.lineLayout as string) ?? DEFAULT_CONFIG.lineLayout,
    pathLevels: validatePathLevels(userConfig.pathLevels as number) ?? DEFAULT_CONFIG.pathLevels,
    maxWidth: validateMaxWidth(userConfig.maxWidth as number | null) ?? DEFAULT_CONFIG.maxWidth,

    gitStatus: {
      enabled: typeof userConfig.gitStatus === 'object' && userConfig.gitStatus !== null
        ? (userConfig.gitStatus as Record<string, unknown>).enabled as boolean ?? DEFAULT_CONFIG.gitStatus.enabled
        : DEFAULT_CONFIG.gitStatus.enabled,
      showDirty: typeof userConfig.gitStatus === 'object' && userConfig.gitStatus !== null
        ? (userConfig.gitStatus as Record<string, unknown>).showDirty as boolean ?? DEFAULT_CONFIG.gitStatus.showDirty
        : DEFAULT_CONFIG.gitStatus.showDirty,
      showAheadBehind: typeof userConfig.gitStatus === 'object' && userConfig.gitStatus !== null
        ? (userConfig.gitStatus as Record<string, unknown>).showAheadBehind as boolean ?? DEFAULT_CONFIG.gitStatus.showAheadBehind
        : DEFAULT_CONFIG.gitStatus.showAheadBehind,
      showFileStats: typeof userConfig.gitStatus === 'object' && userConfig.gitStatus !== null
        ? (userConfig.gitStatus as Record<string, unknown>).showFileStats as boolean ?? DEFAULT_CONFIG.gitStatus.showFileStats
        : DEFAULT_CONFIG.gitStatus.showFileStats,
    },

    display: {
      showModel: typeof userConfig.display === 'object' && userConfig.display !== null
        ? (userConfig.display as Record<string, unknown>).showModel as boolean ?? DEFAULT_CONFIG.display.showModel
        : DEFAULT_CONFIG.display.showModel,
      showProject: typeof userConfig.display === 'object' && userConfig.display !== null
        ? (userConfig.display as Record<string, unknown>).showProject as boolean ?? DEFAULT_CONFIG.display.showProject
        : DEFAULT_CONFIG.display.showProject,
      showContextBar: typeof userConfig.display === 'object' && userConfig.display !== null
        ? (userConfig.display as Record<string, unknown>).showContextBar as boolean ?? DEFAULT_CONFIG.display.showContextBar
        : DEFAULT_CONFIG.display.showContextBar,
      showDuration: typeof userConfig.display === 'object' && userConfig.display !== null
        ? (userConfig.display as Record<string, unknown>).showDuration as boolean ?? DEFAULT_CONFIG.display.showDuration
        : DEFAULT_CONFIG.display.showDuration,
      showCost: typeof userConfig.display === 'object' && userConfig.display !== null
        ? (userConfig.display as Record<string, unknown>).showCost as boolean ?? DEFAULT_CONFIG.display.showCost
        : DEFAULT_CONFIG.display.showCost,
      showCodeStats: typeof userConfig.display === 'object' && userConfig.display !== null
        ? (userConfig.display as Record<string, unknown>).showCodeStats as boolean ?? DEFAULT_CONFIG.display.showCodeStats
        : DEFAULT_CONFIG.display.showCodeStats,
      showVersion: typeof userConfig.display === 'object' && userConfig.display !== null
        ? (userConfig.display as Record<string, unknown>).showVersion as boolean ?? DEFAULT_CONFIG.display.showVersion
        : DEFAULT_CONFIG.display.showVersion,
      showSessionId: typeof userConfig.display === 'object' && userConfig.display !== null
        ? (userConfig.display as Record<string, unknown>).showSessionId as boolean ?? DEFAULT_CONFIG.display.showSessionId
        : DEFAULT_CONFIG.display.showSessionId,
      sessionIdLength: typeof userConfig.display === 'object' && userConfig.display !== null
        ? ((userConfig.display as Record<string, unknown>).sessionIdLength as number) ?? DEFAULT_CONFIG.display.sessionIdLength
        : DEFAULT_CONFIG.display.sessionIdLength,
    },

    colors: {
      model: typeof userConfig.colors === 'object' && userConfig.colors !== null
        ? ((userConfig.colors as Record<string, unknown>).model as string) ?? DEFAULT_CONFIG.colors.model
        : DEFAULT_CONFIG.colors.model,
      project: typeof userConfig.colors === 'object' && userConfig.colors !== null
        ? ((userConfig.colors as Record<string, unknown>).project as string) ?? DEFAULT_CONFIG.colors.project
        : DEFAULT_CONFIG.colors.project,
      git: typeof userConfig.colors === 'object' && userConfig.colors !== null
        ? ((userConfig.colors as Record<string, unknown>).git as string) ?? DEFAULT_CONFIG.colors.git
        : DEFAULT_CONFIG.colors.git,
      gitBranch: typeof userConfig.colors === 'object' && userConfig.colors !== null
        ? ((userConfig.colors as Record<string, unknown>).gitBranch as string) ?? DEFAULT_CONFIG.colors.gitBranch
        : DEFAULT_CONFIG.colors.gitBranch,
      duration: typeof userConfig.colors === 'object' && userConfig.colors !== null
        ? ((userConfig.colors as Record<string, unknown>).duration as string) ?? DEFAULT_CONFIG.colors.duration
        : DEFAULT_CONFIG.colors.duration,
      cost: typeof userConfig.colors === 'object' && userConfig.colors !== null
        ? ((userConfig.colors as Record<string, unknown>).cost as string) ?? DEFAULT_CONFIG.colors.cost
        : DEFAULT_CONFIG.colors.cost,
      label: typeof userConfig.colors === 'object' && userConfig.colors !== null
        ? ((userConfig.colors as Record<string, unknown>).label as string) ?? DEFAULT_CONFIG.colors.label
        : DEFAULT_CONFIG.colors.label,
    },
  };

  return config;
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
