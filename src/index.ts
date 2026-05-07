/**
 * CodeBuddy HUD - Main Entry Point
 *
 * Reads stdin JSON from CodeBuddy Code, gathers context
 * (git status, transcript, config), and renders the statusline output.
 */

import { readStdin, getDuration } from './stdin.js';
import { getGitStatus } from './git.js';
import { loadConfig } from './config.js';
import { parseTranscript } from './transcript.js';
import { render } from './render/index.js';
import { formatDuration } from './render/session-line.js';
import type { RenderContext, TranscriptSummary } from './types.js';

export async function main(): Promise<void> {
  try {
    // 1. Read stdin data from CodeBuddy Code
    const stdin = await readStdin();

    if (!stdin) {
      // Running without stdin (e.g., during setup verification)
      console.log('[codebuddy-hud] ✓ Statusline ready');
      return;
    }

    // 2. Load configuration
    const config = await loadConfig();

    // 3. Get Git status (cached)
    const cwd = stdin.workspace?.current_dir ?? stdin.cwd ?? '';
    const gitStatus = config.gitStatus.enabled
      ? await getGitStatus(cwd)
      : null;

    // 4. Parse transcript for tool/agent/task info (Phase 2)
    let transcript: TranscriptSummary | null = null;
    const transcriptPath = stdin.transcript_path;
    if (transcriptPath && (config.display.showToolsLine || config.display.showAgentsLine || config.display.showTodosLine)) {
      transcript = await parseTranscript(transcriptPath);
    }

    // 5. Calculate session duration
    const durationMs = getDuration(stdin);
    const sessionDuration = formatDuration(durationMs);

    // 6. Assemble render context
    const ctx: RenderContext = {
      stdin,
      gitStatus,
      sessionDuration,
      transcript,
      config,
    };

    // 7. Render output
    render(ctx);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.log(`[codebuddy-hud] Error: ${message}`);
  }
}

// Auto-run when executed directly
const scriptPath = process.argv[1];
if (scriptPath) {
  // Check if this file is being run directly
  const { realpathSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const resolvedScript = realpathSync(scriptPath);
  const resolvedSelf = realpathSync(fileURLToPath(import.meta.url));
  if (resolvedScript === resolvedSelf) {
    void main();
  }
}
