/**
 * CodeBuddy HUD - Internationalization (i18n)
 *
 * Simple i18n system with English and Chinese support.
 * All UI labels, icons, and format strings are localizable.
 */

type Lang = 'en' | 'zh';

interface I18nStrings {
  // Session line labels
  model: string;
  project: string;
  git: string;
  duration: string;
  cost: string;
  codeStats: string;
  version: string;
  session: string;

  // Git status
  gitDirty: string;
  gitAhead: string;
  gitBehind: string;
  modified: string;
  added: string;
  deleted: string;
  untracked: string;

  // Tool activity
  toolActive: string;
  toolCompleted: string;
  toolMore: string;
  toolDone: string;
  toolsLabel: string;

  // Agent status
  agentActive: string;
  agentDone: string;
  agentMore: string;
  agentsLabel: string;

  // Task progress
  taskProgress: string;
  taskMore: string;
  tasksLabel: string;

  // Duration format
  lessThanMinute: string;
  minute: string;
  hour: string;

  // Misc
  statuslineReady: string;
  error: string;
}

const EN: I18nStrings = {
  model: '',
  project: '',
  git: 'git',
  duration: '⏱',
  cost: '💰',
  codeStats: '',
  version: 'v',
  session: '#',

  gitDirty: '*',
  gitAhead: '↑',
  gitBehind: '↓',
  modified: '!',
  added: '+',
  deleted: '✘',
  untracked: '?',

  toolActive: '',
  toolCompleted: '✓',
  toolMore: '+{n} more',
  toolDone: '',
  toolsLabel: 'Tools',

  agentActive: '▸',
  agentDone: '✓ {n} agent{s} done',
  agentMore: '+{n} more',
  agentsLabel: 'Agents',

  taskProgress: '',
  taskMore: '+{n} more',
  tasksLabel: 'Tasks',

  lessThanMinute: '<1m',
  minute: 'm',
  hour: 'h',

  statuslineReady: '[codebuddy-hud] ✓ Statusline ready',
  error: '[codebuddy-hud] Error: {msg}',
};

const ZH: I18nStrings = {
  model: '',
  project: '',
  git: '仓库',
  duration: '⏱',
  cost: '💰',
  codeStats: '',
  version: 'v',
  session: '#',

  gitDirty: '✱',
  gitAhead: '↑',
  gitBehind: '↓',
  modified: '改',
  added: '增',
  deleted: '删',
  untracked: '?',

  toolActive: '',
  toolCompleted: '✓',
  toolMore: '+{n}更多',
  toolDone: '',
  toolsLabel: '工具',

  agentActive: '▸',
  agentDone: '✓ {n}个代理完成',
  agentMore: '+{n}更多',
  agentsLabel: '代理',

  taskProgress: '',
  taskMore: '+{n}更多',
  tasksLabel: '任务',

  lessThanMinute: '<1分',
  minute: '分',
  hour: '时',

  statuslineReady: '[codebuddy-hud] ✓ 状态栏就绪',
  error: '[codebuddy-hud] 错误: {msg}',
};

const STRINGS: Record<Lang, I18nStrings> = { en: EN, zh: ZH };

/**
 * Get the i18n strings for the given language.
 */
export function getStrings(lang: Lang): I18nStrings {
  return STRINGS[lang] ?? STRINGS.en;
}

/**
 * Simple template substitution: replaces {key} with values.
 */
export function t(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = values[key];
    return val !== undefined ? String(val) : `{${key}}`;
  });
}
