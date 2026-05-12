/**
 * CodeBuddy HUD - Internationalization (i18n)
 *
 * Simple i18n system with English and Chinese support.
 * All UI labels, icons, and format strings are localizable.
 */
const EN = {
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
const ZH = {
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
const STRINGS = { en: EN, zh: ZH };
/**
 * Get the i18n strings for the given language.
 */
export function getStrings(lang) {
    return STRINGS[lang] ?? STRINGS.en;
}
/**
 * Simple template substitution: replaces {key} with values.
 */
export function t(template, values) {
    return template.replace(/\{(\w+)\}/g, (_, key) => {
        const val = values[key];
        return val !== undefined ? String(val) : `{${key}}`;
    });
}
//# sourceMappingURL=i18n.js.map