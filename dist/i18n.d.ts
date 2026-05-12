/**
 * CodeBuddy HUD - Internationalization (i18n)
 *
 * Simple i18n system with English and Chinese support.
 * All UI labels, icons, and format strings are localizable.
 */
type Lang = 'en' | 'zh';
interface I18nStrings {
    model: string;
    project: string;
    git: string;
    duration: string;
    cost: string;
    codeStats: string;
    version: string;
    session: string;
    gitDirty: string;
    gitAhead: string;
    gitBehind: string;
    modified: string;
    added: string;
    deleted: string;
    untracked: string;
    toolActive: string;
    toolCompleted: string;
    toolMore: string;
    toolDone: string;
    toolsLabel: string;
    agentActive: string;
    agentDone: string;
    agentMore: string;
    agentsLabel: string;
    taskProgress: string;
    taskMore: string;
    tasksLabel: string;
    lessThanMinute: string;
    minute: string;
    hour: string;
    statuslineReady: string;
    error: string;
}
/**
 * Get the i18n strings for the given language.
 */
export declare function getStrings(lang: Lang): I18nStrings;
/**
 * Simple template substitution: replaces {key} with values.
 */
export declare function t(template: string, values: Record<string, string | number>): string;
export {};
//# sourceMappingURL=i18n.d.ts.map