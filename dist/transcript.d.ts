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
import type { TranscriptSummary } from './types.js';
/**
 * Parse a transcript JSONL file and return a summary.
 * Uses caching to avoid re-parsing unchanged files.
 */
export declare function parseTranscript(filePath: string): Promise<TranscriptSummary | null>;
/**
 * Quick incremental parse: only read the last N lines for active state.
 * Uses byte-level tail reading for large files to avoid reading the entire file.
 */
export declare function parseTranscriptIncremental(filePath: string, tailLines?: number): Promise<TranscriptSummary | null>;
/**
 * Clear the transcript cache (for testing or forced refresh).
 */
export declare function clearTranscriptCache(): void;
//# sourceMappingURL=transcript.d.ts.map