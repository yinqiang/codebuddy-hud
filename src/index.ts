/**
 * CodeBuddy HUD - Main Entry Point
 *
 * Reads stdin JSON from CodeBuddy Code, gathers context
 * (git status, transcript, config), and renders the statusline output.
 */

import { readStdin, getDuration } from './stdin.js';
import { getGitStatus } from './git.js';
import { loadConfig } from './config.js';
import { parseTranscript, parseTranscriptIncremental } from './transcript.js';
import { render } from './render/index.js';
import { formatDuration } from './render/session-line.js';
import { getStrings, t } from './i18n.js';
import type { RenderContext, TranscriptSummary } from './types.js';

export async function main(): Promise<void> {
  const profile = process.env.CODEBUDDY_HUD_PROFILE === '1';
  const t0 = profile ? performance.now() : 0;

  try {
    // 1. Read stdin data from CodeBuddy Code
    const stdin = await readStdin();
    const t1 = profile ? performance.now() : 0;

    if (!stdin) {
      // Running without stdin (e.g., during setup verification)
      console.log('[codebuddy-hud] ✓ Statusline ready');
      return;
    }

    // 2. Load configuration (with preset/theme/language support)
    const config = await loadConfig();
    const s = getStrings(config.language);
    const t2 = profile ? performance.now() : 0;

    // 3. Get Git status (cached, config-aware parallel execution)
    const cwd = stdin.workspace?.current_dir ?? stdin.cwd ?? '';
    const gitStatus = config.gitStatus.enabled
      ? await getGitStatus(cwd, {
          showDirty: config.gitStatus.showDirty,
          showAheadBehind: config.gitStatus.showAheadBehind,
          showFileStats: config.gitStatus.showFileStats,
        })
      : null;
    const t3 = profile ? performance.now() : 0;

    // 4. Parse transcript for tool/agent/task info (Phase 2)
    //    Use incremental parse for large files (> 256KB) to stay within 300ms budget
    let transcript: TranscriptSummary | null = null;
    const transcriptPath = stdin.transcript_path;
    if (transcriptPath && (config.display.showContextBar || config.display.showToolsLine || config.display.showAgentsLine || config.display.showTodosLine)) {
      transcript = await parseTranscriptIncremental(transcriptPath);
    }
    const t4 = profile ? performance.now() : 0;

    // 5. Calculate session duration (i18n-aware)
    const durationMs = getDuration(stdin);
    const sessionDuration = formatDuration(durationMs, config.language);

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
    const t5 = profile ? performance.now() : 0;

    // Output profiling info to stderr (doesn't affect statusline)
    if (profile) {
      process.stderr.write(
        `[hud-profile] stdin:${(t1-t0).toFixed(0)}ms config:${(t2-t1).toFixed(0)}ms git:${(t3-t2).toFixed(0)}ms transcript:${(t4-t3).toFixed(0)}ms render:${(t5-t4).toFixed(0)}ms total:${(t5-t0).toFixed(0)}ms\n`
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.log(t(getStrings('en').error, { msg: message }));
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
