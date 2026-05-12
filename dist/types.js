/**
 * CodeBuddy HUD - Type Definitions
 */
export const DEFAULT_CONFIG = {
    lineLayout: 'compact',
    pathLevels: 1,
    maxWidth: null,
    language: 'en',
    adaptiveLayout: true,
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
        showAgentsLine: true,
        showTodosLine: true,
    },
    colors: {
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
};
//# sourceMappingURL=types.js.map