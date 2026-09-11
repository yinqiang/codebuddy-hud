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
  ContextUsage,
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
 * Uses byte-level tail reading for large files to avoid reading the entire file.
 */
export async function parseTranscriptIncremental(
  filePath: string,
  tailLines: number = 200,
): Promise<TranscriptSummary | null> {
  if (!filePath) return null;

  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return null;

    // Check cache first (same as full parse)
    const cached = transcriptCache.get(filePath);
    if (cached && cached.fileSize === stat.size && cached.lastModifiedMs === stat.mtimeMs) {
      return cached.summary;
    }

    // For small files (< 256KB), just do full parse
    if (stat.size < 256 * 1024) {
      return parseTranscript(filePath);
    }

    // For large files, read only the tail portion
    const tailContent = await readTailBytes(filePath, tailLines, stat.size);
    if (!tailContent) return parseTranscript(filePath);

    const summary = parseTranscriptContent(tailContent);

    // Cache the result
    if (summary) {
      transcriptCache.set(filePath, {
        summary,
        fileSize: stat.size,
        lastModifiedMs: stat.mtimeMs,
        lineCount: 0,
      });
      evictCache();
    }

    return summary;
  } catch {
    return null;
  }
}

// ─── File parsing ───────────────────────────────────────────────────

async function parseTranscriptFile(
  filePath: string,
  _fileSize: number,
): Promise<TranscriptSummary | null> {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const entries: TranscriptEntry[] = [];
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        entries.push(JSON.parse(trimmed) as TranscriptEntry);
      } catch {
        // Skip malformed lines
      }
    }
    return entries.length > 0 ? buildSummary(entries) : null;
  } catch {
    return null;
  }
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

/** Estimate context window size by model id. Returns 0 if unknown. */
function estimateContextWindow(modelId: string): number {
  const id = modelId.toLowerCase();
  // Common model context windows (in tokens)
  if (id.includes('glm-4.5')) return 131072;
  if (id.includes('glm-5')) return 131072;
  if (id.includes('claude')) return 200000;
  if (id.includes('gpt-4o')) return 128000;
  if (id.includes('gpt-4-turbo')) return 128000;
  if (id.includes('gemini-1.5-pro')) return 2000000;
  if (id.includes('gemini-2')) return 1000000;
  return 0;
}

/** Token usage parsed from a single transcript entry. */
interface UsageTokens {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  cacheMissTokens: number;
  /** True when the usage object carried any prompt-cache field */
  hasCacheInfo: boolean;
  /** True when inputTokens already contains the cached portion (OpenAI style) */
  inputIncludesCache: boolean;
}

function asTokenCount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function firstTokenCount(record: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const n = asTokenCount(record[key]);
    if (n > 0) return n;
  }
  return 0;
}

function hasOwnKey(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

/** Read `cached_tokens` from prompt/input token detail objects or arrays. */
function readCachedTokensFromDetails(usage: Record<string, unknown>): number {
  for (const key of ['prompt_tokens_details', 'input_tokens_details']) {
    const details = usage[key];
    if (Array.isArray(details)) {
      for (const item of details) {
        if (item && typeof item === 'object') {
          const n = asTokenCount((item as Record<string, unknown>)['cached_tokens']);
          if (n > 0) return n;
        }
      }
    } else if (details && typeof details === 'object') {
      const n = asTokenCount((details as Record<string, unknown>)['cached_tokens']);
      if (n > 0) return n;
    }
  }
  return 0;
}

/**
 * Parse one usage object into token counts.
 * Supports both cache field families:
 * - Anthropic style: `cache_read_input_tokens` / `cache_creation_input_tokens`
 * - OpenAI/DeepSeek style: `prompt_cache_hit_tokens` / `prompt_cache_miss_tokens` /
 *   `prompt_tokens_details.cached_tokens`
 */
function parseUsageObject(usage: Record<string, unknown>): UsageTokens | null {
  const inputTokens = firstTokenCount(usage, ['input_tokens', 'prompt_tokens']);
  const outputTokens = firstTokenCount(usage, ['output_tokens', 'completion_tokens']);
  if (inputTokens <= 0 && outputTokens <= 0) return null;

  const hasCacheInfo =
    hasOwnKey(usage, 'cache_read_input_tokens') ||
    hasOwnKey(usage, 'cache_creation_input_tokens') ||
    hasOwnKey(usage, 'prompt_cache_hit_tokens') ||
    hasOwnKey(usage, 'prompt_cache_miss_tokens') ||
    hasOwnKey(usage, 'prompt_cache_write_tokens') ||
    hasOwnKey(usage, 'cached_tokens') ||
    hasOwnKey(usage, 'prompt_tokens_details') ||
    hasOwnKey(usage, 'input_tokens_details');

  let cacheReadTokens = firstTokenCount(usage, [
    'cache_read_input_tokens',
    'prompt_cache_hit_tokens',
    'cached_tokens',
  ]);
  // OpenAI-style fields always count the cached portion inside prompt_tokens
  let cacheReadIsOpenAiStyle =
    hasOwnKey(usage, 'prompt_cache_hit_tokens') || hasOwnKey(usage, 'cached_tokens');
  if (cacheReadTokens === 0) {
    cacheReadTokens = readCachedTokensFromDetails(usage);
    if (cacheReadTokens > 0) cacheReadIsOpenAiStyle = true;
  }
  const cacheCreationTokens = firstTokenCount(usage, [
    'cache_creation_input_tokens',
    'prompt_cache_write_tokens',
  ]);
  const cacheMissTokens = firstTokenCount(usage, ['prompt_cache_miss_tokens']);

  // OpenAI-style prompt_tokens includes the cached portion, Anthropic-style
  // input_tokens excludes it. Detect which convention this usage object follows.
  let inputIncludesCache = false;
  if (cacheReadTokens > inputTokens) {
    // The cached portion cannot exceed the prompt itself
    inputIncludesCache = false;
  } else if (cacheMissTokens > 0 && Math.abs(cacheMissTokens + cacheReadTokens - inputTokens) <= 1) {
    inputIncludesCache = true;
  } else if (cacheReadIsOpenAiStyle) {
    inputIncludesCache = true;
  } else {
    const totalTokens = asTokenCount(usage['total_tokens']);
    if (
      totalTokens > 0 &&
      Math.abs(totalTokens - (inputTokens + outputTokens)) <= Math.max(1, Math.round(totalTokens * 0.01))
    ) {
      inputIncludesCache = true;
    }
  }

  return {
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheCreationTokens,
    cacheMissTokens,
    hasCacheInfo,
    inputIncludesCache,
  };
}

/**
 * Try to extract usage data from a transcript entry. Returns null if not found.
 * Checks every location CodeBuddy transcripts use:
 * message.usage → top-level usage → providerData.rawUsage → flat fields → content blocks.
 */
function extractUsage(entry: TranscriptEntry): UsageTokens | null {
  const raw = entry as unknown as Record<string, unknown>;

  // Pattern 1: usage nested under `message` (assistant message records)
  const message = raw['message'];
  if (message && typeof message === 'object' && !Array.isArray(message)) {
    const messageUsage = (message as Record<string, unknown>)['usage'];
    if (messageUsage && typeof messageUsage === 'object') {
      const parsed = parseUsageObject(messageUsage as Record<string, unknown>);
      if (parsed) return parsed;
    }
  }

  // Pattern 2: usage on the entry itself
  if (raw['usage'] && typeof raw['usage'] === 'object') {
    const parsed = parseUsageObject(raw['usage'] as Record<string, unknown>);
    if (parsed) return parsed;
  }

  // Pattern 3: tool call usage recorded by the CLI provider
  const providerData = raw['providerData'];
  if (providerData && typeof providerData === 'object') {
    const rawUsage = (providerData as Record<string, unknown>)['rawUsage'];
    if (rawUsage && typeof rawUsage === 'object') {
      const parsed = parseUsageObject(rawUsage as Record<string, unknown>);
      if (parsed) return parsed;
    }
  }

  // Pattern 4: flat token fields on the entry
  const flat = parseUsageObject(raw);
  if (flat) return flat;

  // Pattern 5: usage blocks inside a content array
  const content = raw['content'];
  if (Array.isArray(content)) {
    for (const item of content) {
      if (item && typeof item === 'object') {
        const itemRec = item as Record<string, unknown>;
        if (itemRec['type'] === 'usage' || itemRec['type'] === 'token_usage') {
          const parsed = parseUsageObject(itemRec);
          if (parsed) return parsed;
        }
      }
    }
  }

  return null;
}

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

  // Track the latest token usage record
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let cacheReadTokens = 0;
  let cacheCreationTokens = 0;
  let cacheMissTokens = 0;
  let hasCacheInfo = false;
  let inputIncludesCache = false;
  let foundUsage = false;

  // Try to determine model id from entries (for context window estimation)
  let modelId = '';
  function getModelId(entry: TranscriptEntry): string {
    const raw = entry as unknown as Record<string, unknown>;
    // The model id appears at the entry level, under `message`, or in `providerData`
    for (const container of [raw, raw['message'], raw['providerData']]) {
      if (!container || typeof container !== 'object') continue;
      const m = (container as Record<string, unknown>)['model'];
      if (typeof m === 'string' && m) return m;
      if (m && typeof m === 'object') {
        const id = (m as Record<string, unknown>)['id'];
        if (typeof id === 'string' && id) return id;
      }
    }
    return '';
  }

  for (const entry of entries) {
    const type = entry.type;

    // Keep the most recent usage record (the API reports cumulative counters)
    const usage = extractUsage(entry);
    if (usage) {
      totalInputTokens = usage.inputTokens;
      totalOutputTokens = usage.outputTokens;
      cacheReadTokens = usage.cacheReadTokens;
      cacheCreationTokens = usage.cacheCreationTokens;
      cacheMissTokens = usage.cacheMissTokens;
      hasCacheInfo = usage.hasCacheInfo;
      inputIncludesCache = usage.inputIncludesCache;
      foundUsage = true;
    }

    // Try to capture model id for context window estimation
    if (!modelId) {
      modelId = getModelId(entry);
    }

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

  // Compute context usage
  const cw = foundUsage ? estimateContextWindow(modelId) : 0;
  const totalTokens = totalInputTokens + totalOutputTokens;
  const percent = cw > 0 ? Math.round((totalTokens / cw) * 100) : -1;

  // Cache hit rate = cached input tokens / total prompt tokens.
  // Anthropic-style input_tokens excludes the cached portion, OpenAI-style includes it.
  let promptTokens = totalInputTokens;
  if (!inputIncludesCache) {
    promptTokens += cacheReadTokens + cacheCreationTokens;
  }
  if (cacheMissTokens > 0) {
    promptTokens = cacheReadTokens + cacheMissTokens;
  }
  const cacheHitRate = hasCacheInfo && promptTokens > 0 ? cacheReadTokens / promptTokens : -1;

  const contextUsage: ContextUsage | null = foundUsage ? {
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    totalTokens,
    contextWindow: cw,
    percentUsed: percent,
    cacheReadTokens,
    cacheHitRate,
  } : null;

  return {
    toolStats,
    agentStatus,
    taskProgress,
    lastAssistantStatus,
    contextUsage,
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

/**
 * Efficient byte-level tail reading for large files.
 * Seeks to near the end of the file and reads backwards to find line boundaries.
 * Much faster than reading the entire file for large transcripts.
 */
async function readTailBytes(
  filePath: string,
  targetLines: number,
  fileSize: number,
): Promise<string | null> {
  // Estimate bytes needed: ~2KB per JSONL line is generous
  const avgLineBytes = 2048;
  const readSize = Math.min(targetLines * avgLineBytes, fileSize);

  return new Promise((resolve) => {
    const fd = fs.openSync(filePath, 'r');

    try {
      // Read from the end of the file
      const startPos = Math.max(0, fileSize - readSize);
      const buf = Buffer.alloc(fileSize - startPos);
      const bytesRead = fs.readSync(fd, buf, 0, buf.length, startPos);

      if (bytesRead === 0) {
        fs.closeSync(fd);
        resolve(null);
        return;
      }

      const content = buf.toString('utf8', 0, bytesRead);

      // If we started mid-file, skip the first partial line
      const firstNewline = startPos > 0 ? content.indexOf('\n') : -1;
      const trimmed = firstNewline >= 0 ? content.slice(firstNewline + 1) : content;

      // Take only the last targetLines lines
      const lines = trimmed.split('\n');
      const tail = lines.slice(-targetLines).join('\n');

      fs.closeSync(fd);
      resolve(tail || null);
    } catch {
      try { fs.closeSync(fd); } catch { /* ignore */ }
      resolve(null);
    }
  });
}

/**
 * Legacy line-by-line tail reader (slower, used as fallback).
 */
async function readTail(filePath: string, lineCount: number): Promise<string | null> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath, { encoding: 'utf8' }),
      crlfDelay: Infinity,
    });

    const lines: string[] = [];

    rl.on('line', (line) => {
      lines.push(line);
      if (lines.length > lineCount * 2) {
        lines.splice(0, lines.length - lineCount);
      }
    });

    rl.on('close', () => {
      const tail = lines.slice(-lineCount);
      resolve(tail.join('\n') || null);
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
