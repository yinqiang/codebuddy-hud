/**
 * CodeBuddy HUD - Type Definitions
 */

// ─── Stdin Data (from CodeBuddy Code) ───────────────────────────────

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

// ─── Git Status ─────────────────────────────────────────────────────

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

// ─── Transcript Data ────────────────────────────────────────────────

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
  output: { type: string; text?: string } | string;
}

export interface MessageEntry extends TranscriptEntry {
  type: 'message';
  role: 'user' | 'assistant';
  status?: string;
  content: unknown[];
}

export interface AgentCallEntry extends ToolCallEntry {
  name: 'Agent';
  arguments: string; // JSON: { description, prompt, ... }
}

export interface TaskActionEntry extends ToolCallEntry {
  name: 'TaskCreate' | 'TaskUpdate' | 'TaskList';
  arguments: string; // JSON: { subject, description, status, taskId, ... }
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

export interface TranscriptSummary {
  toolStats: ToolStats;
  agentStatus: AgentStatus;
  taskProgress: TaskProgress;
  /** Most recent assistant message status */
  lastAssistantStatus: string | null;
}

// ─── Render Context ─────────────────────────────────────────────────

export interface RenderContext {
  stdin: StdinData;
  gitStatus: GitStatus | null;
  sessionDuration: string;
  transcript: TranscriptSummary | null;
  config: HudConfig;
}

// ─── Configuration ──────────────────────────────────────────────────

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

export const DEFAULT_CONFIG: HudConfig = {
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
