/**
 * CodeBuddy HUD - Configuration Loader
 *
 * Loads and validates user configuration from config.json,
 * with preset system, theme system, and i18n support.
 * Merges user config with preset/theme defaults.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { HudConfig } from './types.js';
import { DEFAULT_CONFIG } from './types.js';

// ─── Preset Definitions ─────────────────────────────────────────────

type PresetName = 'full' | 'essential' | 'minimal';

const PRESETS: Record<PresetName, RecursivePartial<HudConfig>> = {
  full: {
    lineLayout: 'compact',
    pathLevels: 1,
    gitStatus: {
      enabled: true,
      showDirty: true,
      showAheadBehind: true,
      showFileStats: true,
    },
    display: {
      showModel: true,
      showProject: true,
      showContextBar: false,
      showDuration: true,
      showCost: true,
      showCodeStats: true,
      showVersion: true,
      showSessionId: true,
      sessionIdLength: 8,
      showToolsLine: true,
      showAgentsLine: true,
      showTodosLine: true,
    },
  },

  essential: {
    lineLayout: 'compact',
    pathLevels: 1,
    gitStatus: {
      enabled: true,
      showDirty: true,
      showAheadBehind: false,
      showFileStats: false,
    },
    display: {
      showModel: true,
      showProject: true,
      showContextBar: false,
      showDuration: true,
      showCost: true,
      showCodeStats: true,
      showVersion: false,
      showSessionId: false,
      sessionIdLength: 8,
      showToolsLine: true,
      showAgentsLine: false,
      showTodosLine: true,
    },
  },

  minimal: {
    lineLayout: 'compact',
    pathLevels: 1,
    gitStatus: {
      enabled: false,
    },
    display: {
      showModel: true,
      showProject: true,
      showContextBar: false,
      showDuration: false,
      showCost: false,
      showCodeStats: false,
      showVersion: false,
      showSessionId: false,
      sessionIdLength: 8,
      showToolsLine: false,
      showAgentsLine: false,
      showTodosLine: false,
    },
  },
};

// ─── Theme Definitions ──────────────────────────────────────────────

type ThemeName = 'default' | 'dracula' | 'solarized' | 'monokai' | 'nord';

const THEMES: Record<ThemeName, HudConfig['colors']> = {
  default: {
    model: 'cyan',
    project: 'yellow',
    git: 'magenta',
    gitBranch: 'cyan',
    duration: 'dim',
    cost: 'green',
    label: 'dim',
    toolActive: 'brightYellow',
    toolCompleted: 'brightGreen',
    agentActive: 'brightCyan',
    taskProgress: 'cyan',
  },

  dracula: {
    model: '#bd93f9',     // purple
    project: '#f1fa8c',   // yellow
    git: '#ff79c6',       // pink
    gitBranch: '#8be9fd', // cyan
    duration: '#6272a4',  // comment
    cost: '#50fa7b',      // green
    label: '#6272a4',     // comment
    toolActive: '#ffb86c', // orange
    toolCompleted: '#50fa7b', // green
    agentActive: '#8be9fd', // cyan
    taskProgress: '#bd93f9', // purple
  },

  solarized: {
    model: '#268bd2',     // blue
    project: '#b58900',   // yellow
    git: '#d33682',       // magenta
    gitBranch: '#2aa198', // cyan
    duration: '#586e75',  // base01
    cost: '#859900',      // green
    label: '#586e75',     // base01
    toolActive: '#cb4b16', // orange
    toolCompleted: '#859900', // green
    agentActive: '#2aa198', // cyan
    taskProgress: '#268bd2', // blue
  },

  monokai: {
    model: '#a6e22e',     // green
    project: '#e6db74',   // yellow
    git: '#f92672',       // red/pink
    gitBranch: '#66d9ef', // blue
    duration: '#75715e',  // comment
    cost: '#a6e22e',      // green
    label: '#75715e',     // comment
    toolActive: '#fd971f', // orange
    toolCompleted: '#a6e22e', // green
    agentActive: '#66d9ef', // blue
    taskProgress: '#ae81ff', // purple
  },

  nord: {
    model: '#88c0d0',     // frost4
    project: '#ebcb8b',   // yellow
    git: '#b48ead',       // purple
    gitBranch: '#81a1c1', // frost2
    duration: '#4c566a',  // snow3
    cost: '#a3be8c',      // green
    label: '#4c566a',     // snow3
    toolActive: '#d08770', // orange
    toolCompleted: '#a3be8c', // green
    agentActive: '#88c0d0', // frost4
    taskProgress: '#81a1c1', // frost2
  },
};

// ─── Config Loading ─────────────────────────────────────────────────

type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends object ? RecursivePartial<T[P]> : T[P];
};

interface RawUserConfig extends RecursivePartial<HudConfig> {
  preset?: PresetName;
  theme?: ThemeName;
  language?: 'en' | 'zh';
  adaptiveLayout?: boolean;
}

/**
 * Get the config file path.
 * Stored alongside the statusline script in the plugin directory.
 */
export function getConfigPath(): string {
  const pluginDir = path.dirname(path.dirname(new URL(import.meta.url).pathname));
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
    const userConfig = JSON.parse(raw) as RawUserConfig;
    return buildConfig(userConfig);
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Build final config from raw user config, applying preset + theme.
 */
export function buildConfig(raw: RawUserConfig): HudConfig {
  // 1. Start with preset (or default)
  const presetName = raw.preset ?? 'essential';
  const preset = PRESETS[presetName] ?? PRESETS.essential;

  // 2. Apply theme (or default)
  const themeName = raw.theme ?? 'default';
  const themeColors = THEMES[themeName] ?? THEMES.default;

  // 3. Merge: preset → theme → user overrides → user color overrides
  const d = DEFAULT_CONFIG;

  const config: HudConfig = {
    lineLayout: validateLineLayout(raw.lineLayout) ?? preset.lineLayout ?? d.lineLayout,
    pathLevels: validatePathLevels(raw.pathLevels) ?? preset.pathLevels ?? d.pathLevels,
    maxWidth: validateMaxWidth(raw.maxWidth) ?? preset.maxWidth ?? d.maxWidth,
    language: raw.language ?? d.language,
    adaptiveLayout: raw.adaptiveLayout ?? d.adaptiveLayout,

    gitStatus: {
      enabled: raw.gitStatus?.enabled ?? preset.gitStatus?.enabled ?? d.gitStatus.enabled,
      showDirty: raw.gitStatus?.showDirty ?? preset.gitStatus?.showDirty ?? d.gitStatus.showDirty,
      showAheadBehind: raw.gitStatus?.showAheadBehind ?? preset.gitStatus?.showAheadBehind ?? d.gitStatus.showAheadBehind,
      showFileStats: raw.gitStatus?.showFileStats ?? preset.gitStatus?.showFileStats ?? d.gitStatus.showFileStats,
    },

    display: {
      showModel: raw.display?.showModel ?? preset.display?.showModel ?? d.display.showModel,
      showProject: raw.display?.showProject ?? preset.display?.showProject ?? d.display.showProject,
      showContextBar: raw.display?.showContextBar ?? preset.display?.showContextBar ?? d.display.showContextBar,
      showDuration: raw.display?.showDuration ?? preset.display?.showDuration ?? d.display.showDuration,
      showCost: raw.display?.showCost ?? preset.display?.showCost ?? d.display.showCost,
      showCodeStats: raw.display?.showCodeStats ?? preset.display?.showCodeStats ?? d.display.showCodeStats,
      showVersion: raw.display?.showVersion ?? preset.display?.showVersion ?? d.display.showVersion,
      showSessionId: raw.display?.showSessionId ?? preset.display?.showSessionId ?? d.display.showSessionId,
      sessionIdLength: raw.display?.sessionIdLength ?? preset.display?.sessionIdLength ?? d.display.sessionIdLength,
      showToolsLine: raw.display?.showToolsLine ?? preset.display?.showToolsLine ?? d.display.showToolsLine,
      showAgentsLine: raw.display?.showAgentsLine ?? preset.display?.showAgentsLine ?? d.display.showAgentsLine,
      showTodosLine: raw.display?.showTodosLine ?? preset.display?.showTodosLine ?? d.display.showTodosLine,
    },

    colors: {
      model: raw.colors?.model ?? themeColors.model,
      project: raw.colors?.project ?? themeColors.project,
      git: raw.colors?.git ?? themeColors.git,
      gitBranch: raw.colors?.gitBranch ?? themeColors.gitBranch,
      duration: raw.colors?.duration ?? themeColors.duration,
      cost: raw.colors?.cost ?? themeColors.cost,
      label: raw.colors?.label ?? themeColors.label,
      toolActive: raw.colors?.toolActive ?? themeColors.toolActive,
      toolCompleted: raw.colors?.toolCompleted ?? themeColors.toolCompleted,
      agentActive: raw.colors?.agentActive ?? themeColors.agentActive,
      taskProgress: raw.colors?.taskProgress ?? themeColors.taskProgress,
    },

    contextBar: {
      mode: raw.contextBar?.mode ?? preset.contextBar?.mode ?? d.contextBar.mode,
      showBreakdown: raw.contextBar?.showBreakdown ?? preset.contextBar?.showBreakdown ?? d.contextBar.showBreakdown,
    },
  };

  return config;
}

// ─── Preset/Theme lookup helpers ────────────────────────────────────

export function getPresetNames(): string[] {
  return Object.keys(PRESETS);
}

export function getThemeNames(): string[] {
  return Object.keys(THEMES);
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
