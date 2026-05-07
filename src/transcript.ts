/**
 * CodeBuddy HUD - Transcript Parser
 *
 * Parses CodeBuddy Code transcript JSONL files to extract
 * tool activity, agent status, and task progress.
 *
 * Transcript format (JSONL, one JSON object per line):
 * - type: "message"       → user/assistant messages
 * - type: "function_call" → tool invocations (name, arguments, callId)
 * - type: "function_call_result" → tool results (name, callId, status, output)
 * - type: "reasoning"     → model reasoning traces
 * - type: "file-history-snapshot" → file state snapshots
 */

import * as fs from 'node:fs';
import * as readline from 'node:readline';
import type {
  TranscriptEntry,
  ToolCallEntry,
  ToolResultEntry,
  MessageEntry,
  TranscriptSummary,
  ToolStats,
  AgentStatus,
  TaskProgress,
} from './types.js';

// ─── Cache ──────────────────────────────────────────────────────────

interface CacheEntry {
  summary: TranscriptSummary;
  fileSize: number;
  lastModifiedMs: number;
  lineCount: number;
}

const transcriptCache = new Map<string, CacheEntry>();

// ─── Internal task state tracking ───────────────────────────────────

interface TaskState {
  subject: string;
  status: 'pending' | 'in_progress' | 'completed' | 'deleted';
}

// ─── Main parser ────────────────────────────────────────────────────

/**
 * Parse a transcript JSONL file and return a summary.
 * Uses caching to avoid re-parsing unchanged files.
 */
export async function parseTranscript(filePath: string): Promise<TranscriptSummary | null> {
  if (!filePath) return null;

  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return null;

    // Check cache
    const cached = transcriptCache.get(filePath);
    if (cached && cached.fileSize === stat.size && cached.lastModifiedMs === stat.mtimeMs) {
      return cached.summary;
    }

    // Parse the transcript
    const summary = await parseTranscriptFile(filePath, stat.size);

    // Update cache
    if (summary) {
      transcriptCache.set(filePath, {
        summary,
        fileSize: stat.size,
        lastModifiedMs: stat.mtimeMs,
        lineCount: 0,
      });

      // Evict old entries
      evictCache();
    }

    return summary;
  } catch {
    return null;
  }
}

/**
 * Quick incremental parse: only read the last N lines for active state.
 * Falls back to full parse for small files.
 */
export async function parseTranscriptIncremental(
  filePath: string,
  tailLines: number = 100,
): Promise<TranscriptSummary | null> {
  if (!filePath) return null;

  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return null;

    // For small files (< 64KB), just do full parse
    if (stat.size < 64 * 1024) {
      return parseTranscript(filePath);
    }

    // Read tail of file for active state
    const tailContent = await readTail(filePath, tailLines);
    if (!tailContent) return parseTranscript(filePath);

    // For incremental, we only get active tool + recent task state
    return parseTranscriptContent(tailContent);
  } catch {
    return null;
  }
}

// ─── File parsing ───────────────────────────────────────────────────

async function parseTranscriptFile(
  filePath: string,
  _fileSize: number,
): Promise<TranscriptSummary | null> {
  const entries: TranscriptEntry[] = [];

  try {
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath, { encoding: 'utf8' }),
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const entry = JSON.parse(trimmed) as TranscriptEntry;
        entries.push(entry);
      } catch {
        // Skip malformed lines
      }
    }
  } catch {
    return null;
  }

  return buildSummary(entries);
}

function parseTranscriptContent(content: string): TranscriptSummary | null {
  const entries: TranscriptEntry[] = [];

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      entries.push(JSON.parse(trimmed) as TranscriptEntry);
    } catch {
      // Skip
    }
  }

  if (entries.length === 0) return null;
  return buildSummary(entries);
}

// ─── Summary builder ────────────────────────────────────────────────

function buildSummary(entries: TranscriptEntry[]): TranscriptSummary {
  // Track tool calls: callId → tool name
  const pendingCalls = new Map<string, string>();
  const completedCounts = new Map<string, number>();
  let activeTool: string | null = null;
  let activeToolDetail: string | null = null;

  // Track agents
  let totalAgentsLaunched = 0;
  let agentsCompleted = 0;
  const activeAgentDescriptions: string[] = [];
  const pendingAgentCalls = new Map<string, string>(); // callId → description

  // Track tasks
  const tasks = new Map<string, TaskState>();
  let taskCounter = 0;

  // Track last assistant status
  let lastAssistantStatus: string | null = null;

  for (const entry of entries) {
    const type = entry.type;

    if (type === 'function_call') {
      const fc = entry as ToolCallEntry;
      const toolName = fc.name;
      const callId = fc.callId;

      if (callId) {
        pendingCalls.set(callId, toolName);
      }

      // Special handling for Agent calls
      if (toolName === 'Agent') {
        totalAgentsLaunched++;
        const desc = parseAgentDescription(fc.arguments);
        if (callId) {
          pendingAgentCalls.set(callId, desc);
        }
        // Agent is considered active until its result comes in
        activeAgentDescriptions.push(desc);
      }

      // Special handling for Task actions
      if (toolName === 'TaskCreate') {
        taskCounter++;
        const subject = parseTaskSubject(fc.arguments);
        tasks.set(String(taskCounter), { subject, status: 'pending' });
      }

      if (toolName === 'TaskUpdate') {
        const update = parseTaskUpdate(fc.arguments);
        if (update.taskId && tasks.has(update.taskId)) {
          const task = tasks.get(update.taskId)!;
          if (update.status && isValidTaskStatus(update.status)) {
            task.status = update.status;
          }
        }
      }

      // Mark as active tool (most recent call without result)
      activeTool = toolName;
      activeToolDetail = parseToolDetail(toolName, fc.arguments);
    }

    if (type === 'function_call_result') {
      const fr = entry as ToolResultEntry;
      const callId = fr.callId;
      const toolName = fr.name;
      const status = fr.status;

      if (callId) {
        pendingCalls.delete(callId);
      }

      if (status === 'completed' && toolName) {
        completedCounts.set(toolName, (completedCounts.get(toolName) ?? 0) + 1);
      }

      // Check if this was an Agent result
      if (toolName === 'Agent' && callId) {
        const desc = pendingAgentCalls.get(callId);
        if (desc) {
          pendingAgentCalls.delete(callId);
          agentsCompleted++;
          // Remove from active descriptions
          const idx = activeAgentDescriptions.indexOf(desc);
          if (idx >= 0) activeAgentDescriptions.splice(idx, 1);
        }
      }

      // Clear active tool if this was the most recent pending call
      if (pendingCalls.size === 0) {
        activeTool = null;
        activeToolDetail = null;
      }
    }

    if (type === 'message') {
      const msg = entry as MessageEntry;
      if (msg.role === 'assistant' && msg.status) {
        lastAssistantStatus = msg.status;
      }
    }
  }

  const toolStats: ToolStats = {
    activeTool,
    activeToolDetail,
    completedCounts,
    totalCompleted: Array.from(completedCounts.values()).reduce((a, b) => a + b, 0),
  };

  const agentStatus: AgentStatus = {
    activeCount: activeAgentDescriptions.length,
    activeDescriptions: activeAgentDescriptions,
    totalLaunched: totalAgentsLaunched,
    completedCount: agentsCompleted,
  };

  // Build task progress from tracked tasks
  let taskCompleted = 0;
  let taskInProgress = 0;
  const activeSubjects: string[] = [];

  for (const [, state] of tasks) {
    if (state.status === 'completed' || state.status === 'deleted') {
      taskCompleted++;
    } else if (state.status === 'in_progress') {
      taskInProgress++;
      activeSubjects.push(state.subject);
    }
  }

  const taskProgress: TaskProgress = {
    total: tasks.size,
    completed: taskCompleted,
    inProgress: taskInProgress,
    activeSubjects,
  };

  return {
    toolStats,
    agentStatus,
    taskProgress,
    lastAssistantStatus,
  };
}

// ─── Argument parsing helpers ────────────────────────────────────────

function parseAgentDescription(argsJson: string): string {
  try {
    const args = JSON.parse(argsJson);
    return args.description ?? args.prompt?.slice(0, 40) ?? 'Agent';
  } catch {
    return 'Agent';
  }
}

function parseTaskSubject(argsJson: string): string {
  try {
    const args = JSON.parse(argsJson);
    return args.subject ?? args.description ?? 'Task';
  } catch {
    return 'Task';
  }
}

function parseTaskUpdate(argsJson: string): { taskId?: string; status?: string } {
  try {
    const args = JSON.parse(argsJson);
    return {
      taskId: args.taskId != null ? String(args.taskId) : undefined,
      status: args.status,
    };
  } catch {
    return {};
  }
}

function parseToolDetail(toolName: string, argsJson: string): string | null {
  try {
    const args = JSON.parse(argsJson);
    // Show relevant detail per tool type
    switch (toolName) {
      case 'Read':
        return args.file_path ?? args.filePath ?? null;
      case 'Edit':
        return args.file_path ?? args.filePath ?? null;
      case 'Write':
        return args.file_path ?? args.filePath ?? null;
      case 'Bash':
        return truncate(args.description ?? args.command ?? '', 40);
      case 'WebFetch':
        return truncate(args.url ?? '', 40);
      case 'WebSearch':
        return truncate(args.query ?? '', 30);
      case 'Agent':
        return args.description ?? null;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

function truncate(str: string, maxLen: number): string {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}

const VALID_TASK_STATUSES = new Set(['pending', 'in_progress', 'completed', 'deleted']);

function isValidTaskStatus(status: string): status is TaskState['status'] {
  return VALID_TASK_STATUSES.has(status);
}

// ─── Tail reading ───────────────────────────────────────────────────

async function readTail(filePath: string, lineCount: number): Promise<string | null> {
  return new Promise((resolve) => {
    let output = '';
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath, { encoding: 'utf8' }),
      crlfDelay: Infinity,
    });

    const lines: string[] = [];

    rl.on('line', (line) => {
      lines.push(line);
      if (lines.length > lineCount * 2) {
        // Keep a sliding window
        lines.splice(0, lines.length - lineCount);
      }
    });

    rl.on('close', () => {
      const tail = lines.slice(-lineCount);
      output = tail.join('\n');
      resolve(output || null);
    });

    rl.on('error', () => {
      resolve(null);
    });
  });
}

// ─── Cache management ───────────────────────────────────────────────

function evictCache(): void {
  if (transcriptCache.size <= 5) return;

  // Simple eviction: clear all if too many entries
  // (transcript files rarely change mid-session)
  const entries = Array.from(transcriptCache.entries());
  // Keep only the most recent 3
  const toKeep = entries.slice(-3);
  transcriptCache.clear();
  for (const [key, value] of toKeep) {
    transcriptCache.set(key, value);
  }
}

/**
 * Clear the transcript cache (for testing or forced refresh).
 */
export function clearTranscriptCache(): void {
  transcriptCache.clear();
}
