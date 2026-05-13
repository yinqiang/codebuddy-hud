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
const transcriptCache = new Map();
// ─── Main parser ────────────────────────────────────────────────────
/**
 * Parse a transcript JSONL file and return a summary.
 * Uses caching to avoid re-parsing unchanged files.
 */
export async function parseTranscript(filePath) {
    if (!filePath)
        return null;
    try {
        const stat = fs.statSync(filePath);
        if (!stat.isFile())
            return null;
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
    }
    catch {
        return null;
    }
}
/**
 * Quick incremental parse: only read the last N lines for active state.
 * Uses byte-level tail reading for large files to avoid reading the entire file.
 */
export async function parseTranscriptIncremental(filePath, tailLines = 200) {
    if (!filePath)
        return null;
    try {
        const stat = fs.statSync(filePath);
        if (!stat.isFile())
            return null;
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
        if (!tailContent)
            return parseTranscript(filePath);
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
    }
    catch {
        return null;
    }
}
// ─── File parsing ───────────────────────────────────────────────────
async function parseTranscriptFile(filePath, _fileSize) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const entries = [];
        for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed)
                continue;
            try {
                entries.push(JSON.parse(trimmed));
            }
            catch {
                // Skip malformed lines
            }
        }
        return entries.length > 0 ? buildSummary(entries) : null;
    }
    catch {
        return null;
    }
}
function parseTranscriptContent(content) {
    const entries = [];
    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed)
            continue;
        try {
            entries.push(JSON.parse(trimmed));
        }
        catch {
            // Skip
        }
    }
    if (entries.length === 0)
        return null;
    return buildSummary(entries);
}
// ─── Summary builder ────────────────────────────────────────────────
/** Estimate context window size by model id. Returns 0 if unknown. */
function estimateContextWindow(modelId) {
    const id = modelId.toLowerCase();
    // Common model context windows (in tokens)
    if (id.includes('glm-4.5'))
        return 131072;
    if (id.includes('glm-5'))
        return 131072;
    if (id.includes('claude-3.5'))
        return 200000;
    if (id.includes('claude-3.7'))
        return 200000;
    if (id.includes('claude-4'))
        return 200000;
    if (id.includes('gpt-4o'))
        return 128000;
    if (id.includes('gpt-4-turbo'))
        return 128000;
    if (id.includes('gemini-1.5-pro'))
        return 2000000;
    if (id.includes('gemini-2'))
        return 1000000;
    return 0;
}
/** Try to extract usage data from a transcript entry. Returns null if not found. */
function extractUsage(entry) {
    // Check common fields where usage might appear
    const raw = entry;
    // Pattern 1: entry has a direct `usage` object (Claude API style)
    const usage = raw['usage'];
    if (usage) {
        const input = Number(usage['input_tokens'] ?? usage['prompt_tokens'] ?? 0);
        const output = Number(usage['output_tokens'] ?? usage['completion_tokens'] ?? 0);
        if (input > 0 || output > 0) {
            return { inputTokens: input, outputTokens: output };
        }
    }
    // Pattern 2: entry has top-level token fields
    const input = Number(raw['input_tokens'] ?? raw['prompt_tokens'] ?? 0);
    const output = Number(raw['output_tokens'] ?? raw['completion_tokens'] ?? 0);
    if (input > 0 || output > 0) {
        return { inputTokens: input, outputTokens: output };
    }
    // Pattern 3: message content contains usage (some APIs nest it)
    const content = raw['content'];
    if (Array.isArray(content)) {
        for (const item of content) {
            if (item && typeof item === 'object') {
                const itemRec = item;
                if (itemRec['type'] === 'usage' || itemRec['type'] === 'token_usage') {
                    const input = Number(itemRec['input_tokens'] ?? itemRec['prompt_tokens'] ?? 0);
                    const output = Number(itemRec['output_tokens'] ?? itemRec['completion_tokens'] ?? 0);
                    if (input > 0 || output > 0) {
                        return { inputTokens: input, outputTokens: output };
                    }
                }
            }
        }
    }
    return null;
}
function buildSummary(entries) {
    // Track tool calls: callId → tool name
    const pendingCalls = new Map();
    const completedCounts = new Map();
    let activeTool = null;
    let activeToolDetail = null;
    // Track agents
    let totalAgentsLaunched = 0;
    let agentsCompleted = 0;
    const activeAgentDescriptions = [];
    const pendingAgentCalls = new Map(); // callId → description
    // Track tasks
    const tasks = new Map();
    let taskCounter = 0;
    // Track last assistant status
    let lastAssistantStatus = null;
    // Track cumulative token usage
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let contextWindow = 0;
    let foundUsage = false;
    // Try to determine model id from entries (for context window estimation)
    let modelId = '';
    function getModelId(entry) {
        const raw = entry;
        const m = raw['model'];
        if (typeof m === 'string')
            return m;
        if (m && typeof m === 'object')
            return m['id'] ?? '';
        return '';
    }
    for (const entry of entries) {
        const type = entry.type;
        // Try to extract usage data from any entry
        if (!foundUsage) {
            const usage = extractUsage(entry);
            if (usage) {
                totalInputTokens = usage.inputTokens;
                totalOutputTokens = usage.outputTokens;
                foundUsage = true;
            }
        }
        else {
            // Keep updating with latest usage data
            const usage = extractUsage(entry);
            if (usage) {
                totalInputTokens = usage.inputTokens;
                totalOutputTokens = usage.outputTokens;
            }
        }
        // Try to capture model id for context window estimation
        if (!modelId) {
            modelId = getModelId(entry);
        }
        if (type === 'function_call') {
            const fc = entry;
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
                    const task = tasks.get(update.taskId);
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
            const fr = entry;
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
                    if (idx >= 0)
                        activeAgentDescriptions.splice(idx, 1);
                }
            }
            // Clear active tool if this was the most recent pending call
            if (pendingCalls.size === 0) {
                activeTool = null;
                activeToolDetail = null;
            }
        }
        if (type === 'message') {
            const msg = entry;
            if (msg.role === 'assistant' && msg.status) {
                lastAssistantStatus = msg.status;
            }
        }
    }
    const toolStats = {
        activeTool,
        activeToolDetail,
        completedCounts,
        totalCompleted: Array.from(completedCounts.values()).reduce((a, b) => a + b, 0),
    };
    const agentStatus = {
        activeCount: activeAgentDescriptions.length,
        activeDescriptions: activeAgentDescriptions,
        totalLaunched: totalAgentsLaunched,
        completedCount: agentsCompleted,
    };
    // Build task progress from tracked tasks
    let taskCompleted = 0;
    let taskInProgress = 0;
    const activeSubjects = [];
    for (const [, state] of tasks) {
        if (state.status === 'completed' || state.status === 'deleted') {
            taskCompleted++;
        }
        else if (state.status === 'in_progress') {
            taskInProgress++;
            activeSubjects.push(state.subject);
        }
    }
    const taskProgress = {
        total: tasks.size,
        completed: taskCompleted,
        inProgress: taskInProgress,
        activeSubjects,
    };
    // Compute context usage
    const cw = foundUsage ? estimateContextWindow(modelId) : 0;
    const totalTokens = totalInputTokens + totalOutputTokens;
    const percent = cw > 0 ? Math.round((totalTokens / cw) * 100) : -1;
    const contextUsage = foundUsage ? {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        totalTokens,
        contextWindow: cw,
        percentUsed: percent,
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
function parseAgentDescription(argsJson) {
    try {
        const args = JSON.parse(argsJson);
        return args.description ?? args.prompt?.slice(0, 40) ?? 'Agent';
    }
    catch {
        return 'Agent';
    }
}
function parseTaskSubject(argsJson) {
    try {
        const args = JSON.parse(argsJson);
        return args.subject ?? args.description ?? 'Task';
    }
    catch {
        return 'Task';
    }
}
function parseTaskUpdate(argsJson) {
    try {
        const args = JSON.parse(argsJson);
        return {
            taskId: args.taskId != null ? String(args.taskId) : undefined,
            status: args.status,
        };
    }
    catch {
        return {};
    }
}
function parseToolDetail(toolName, argsJson) {
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
    }
    catch {
        return null;
    }
}
function truncate(str, maxLen) {
    if (!str)
        return '';
    return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}
const VALID_TASK_STATUSES = new Set(['pending', 'in_progress', 'completed', 'deleted']);
function isValidTaskStatus(status) {
    return VALID_TASK_STATUSES.has(status);
}
// ─── Tail reading ───────────────────────────────────────────────────
/**
 * Efficient byte-level tail reading for large files.
 * Seeks to near the end of the file and reads backwards to find line boundaries.
 * Much faster than reading the entire file for large transcripts.
 */
async function readTailBytes(filePath, targetLines, fileSize) {
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
        }
        catch {
            try {
                fs.closeSync(fd);
            }
            catch { /* ignore */ }
            resolve(null);
        }
    });
}
/**
 * Legacy line-by-line tail reader (slower, used as fallback).
 */
async function readTail(filePath, lineCount) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: fs.createReadStream(filePath, { encoding: 'utf8' }),
            crlfDelay: Infinity,
        });
        const lines = [];
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
function evictCache() {
    if (transcriptCache.size <= 5)
        return;
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
export function clearTranscriptCache() {
    transcriptCache.clear();
}
//# sourceMappingURL=transcript.js.map