/**
 * CodeBuddy HUD - Type Definitions
 */
export interface StdinData {
    hook_event_name: string;
    session_id: string;
    transcript_path?: string;
    cwd?: string;
    model: {
        id: string;
        display_name: string;
    };
    workspace: {
        current_dir: string;
        project_dir: string;
    };
    version?: string;
    output_style?: {
        name: string;
    };
    cost: {
        total_cost_usd: number;
        total_duration_ms: number;
        total_api_duration_ms: number;
        total_lines_added: number;
        total_lines_removed: number;
    };
}
export interface LineDiff {
    added: number;
    deleted: number;
}
export interface TrackedFile {
    basename: string;
    fullPath: string;
    type: 'modified' | 'added' | 'deleted';
    lineDiff?: LineDiff;
}
export interface FileStats {
    modified: number;
    added: number;
    deleted: number;
    untracked: number;
    trackedFiles: TrackedFile[];
}
export interface GitStatus {
    branch: string;
    isDirty: boolean;
    ahead: number;
    behind: number;
    fileStats?: FileStats;
    lineDiff?: LineDiff;
}
export interface TranscriptEntry {
    id: string;
    timestamp: number;
    type: string;
    parentId?: string;
    sessionId?: string;
    cwd?: string;
    [key: string]: unknown;
}
export interface ToolCallEntry extends TranscriptEntry {
    type: 'function_call';
    name: string;
    arguments: string;
    callId: string;
}
export interface ToolResultEntry extends TranscriptEntry {
    type: 'function_call_result';
    name: string;
    callId: string;
    status: string;
    output: {
        type: string;
        text?: string;
    } | string;
}
export interface MessageEntry extends TranscriptEntry {
    type: 'message';
    role: 'user' | 'assistant';
    status?: string;
    content: unknown[];
}
export interface AgentCallEntry extends ToolCallEntry {
    name: 'Agent';
    arguments: string;
}
export interface TaskActionEntry extends ToolCallEntry {
    name: 'TaskCreate' | 'TaskUpdate' | 'TaskList';
    arguments: string;
}
export interface ToolStats {
    /** Currently executing tool name (if any) */
    activeTool: string | null;
    /** Active tool arguments display text */
    activeToolDetail: string | null;
    /** Count of completed calls per tool name */
    completedCounts: Map<string, number>;
    /** Total completed tool calls */
    totalCompleted: number;
}
export interface AgentStatus {
    /** Number of active sub-agents */
    activeCount: number;
    /** Descriptions of active agents */
    activeDescriptions: string[];
    /** Total agents launched */
    totalLaunched: number;
    /** Completed agents */
    completedCount: number;
}
export interface TaskProgress {
    /** Total tasks created */
    total: number;
    /** Completed tasks */
    completed: number;
    /** In-progress tasks */
    inProgress: number;
    /** Current in-progress task subjects */
    activeSubjects: string[];
}
export interface ContextUsage {
    /** Input tokens used (prompt + context) */
    inputTokens: number;
    /** Output tokens generated */
    outputTokens: number;
    /** Total tokens used this session */
    totalTokens: number;
    /** Context window size for the current model (0 if unknown) */
    contextWindow: number;
    /** Percentage of context window used (0-100, -1 if unknown) */
    percentUsed: number;
}
export interface TranscriptSummary {
    toolStats: ToolStats;
    agentStatus: AgentStatus;
    taskProgress: TaskProgress;
    /** Most recent assistant message status */
    lastAssistantStatus: string | null;
    /** Context token usage (null if not available) */
    contextUsage: ContextUsage | null;
}
export interface RenderContext {
    stdin: StdinData;
    gitStatus: GitStatus | null;
    sessionDuration: string;
    transcript: TranscriptSummary | null;
    config: HudConfig;
}
export type LineLayoutType = 'compact' | 'expanded';
export type ContextValueMode = 'percent' | 'tokens' | 'remaining' | 'both';
export interface HudConfig {
    lineLayout: LineLayoutType;
    pathLevels: number;
    maxWidth: number | null;
    language: 'en' | 'zh';
    adaptiveLayout: boolean;
    gitStatus: {
        enabled: boolean;
        showDirty: boolean;
        showAheadBehind: boolean;
        showFileStats: boolean;
    };
    display: {
        showModel: boolean;
        showProject: boolean;
        showContextBar: boolean;
        showDuration: boolean;
        showCost: boolean;
        showCodeStats: boolean;
        showVersion: boolean;
        showSessionId: boolean;
        sessionIdLength: number;
        showToolsLine: boolean;
        showAgentsLine: boolean;
        showTodosLine: boolean;
    };
    /** Context bar display mode (how to show token usage) */
    contextBar: {
        mode: ContextValueMode;
        /** Show input/output breakdown */
        showBreakdown: boolean;
    };
    colors: {
        model: string;
        project: string;
        git: string;
        gitBranch: string;
        duration: string;
        cost: string;
        label: string;
        toolActive: string;
        toolCompleted: string;
        agentActive: string;
        taskProgress: string;
    };
}
export declare const DEFAULT_CONFIG: HudConfig;
//# sourceMappingURL=types.d.ts.map