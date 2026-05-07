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

// ─── Render Context ─────────────────────────────────────────────────

export interface RenderContext {
  stdin: StdinData;
  gitStatus: GitStatus | null;
  sessionDuration: string;
  config: HudConfig;
}

// ─── Configuration ──────────────────────────────────────────────────

export type LineLayoutType = 'compact' | 'expanded';
export type ContextValueMode = 'percent' | 'tokens' | 'remaining' | 'both';

export interface HudConfig {
  lineLayout: LineLayoutType;
  pathLevels: number;
  maxWidth: number | null;

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
  };

  colors: {
    model: string;
    project: string;
    git: string;
    gitBranch: string;
    duration: string;
    cost: string;
    label: string;
  };
}

export const DEFAULT_CONFIG: HudConfig = {
  lineLayout: 'compact',
  pathLevels: 1,
  maxWidth: null,

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
  },

  colors: {
    model: 'cyan',
    project: 'yellow',
    git: 'magenta',
    gitBranch: 'cyan',
    duration: 'dim',
    cost: 'green',
    label: 'dim',
  },
};
