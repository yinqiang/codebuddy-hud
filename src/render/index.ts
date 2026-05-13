/**
 * CodeBuddy HUD - Render Index
 *
 * Main rendering entry point. Assembles the statusline output
 * from the render context, supporting compact/expanded layouts
 * and adaptive terminal-width selection.
 */

import type { RenderContext } from '../types.js';
import { renderSessionLine } from './session-line.js';
import { renderToolsLine } from './tools-line.js';
import { renderAgentsLine } from './agents-line.js';
import { renderTodosLine } from './todos-line.js';
import { renderContextBar } from './context-bar.js';
import { stripAnsi, RESET } from './colors.js';
import { getTerminalWidth, UNKNOWN_TERMINAL_WIDTH } from '../utils/terminal.js';
import { visualLength } from './width.js';

/** Minimum terminal width for compact layout */
const COMPACT_MIN_WIDTH = 80;
/** Minimum terminal width for expanded layout */
const EXPANDED_MIN_WIDTH = 40;

/**
 * Determine effective layout based on terminal width.
 */
function resolveLayout(ctx: RenderContext): 'compact' | 'expanded' {
  if (!ctx.config.adaptiveLayout) {
    return ctx.config.lineLayout;
  }

  const termWidth = getTerminalWidth();
  if (termWidth === UNKNOWN_TERMINAL_WIDTH) {
    return ctx.config.lineLayout; // Can't detect, use config
  }

  if (termWidth < EXPANDED_MIN_WIDTH) {
    return 'compact'; // Very narrow, use compact
  }
  if (termWidth < COMPACT_MIN_WIDTH) {
    return 'expanded'; // Medium width, expanded is more readable
  }
  return ctx.config.lineLayout; // Wide enough, use user preference
}

/**
 * Truncate a line to fit within maxWidth, preserving ANSI codes.
 */
function truncateLine(line: string, maxWidth: number | null): string {
  if (!maxWidth || maxWidth <= 0) return line;

  const visibleLen = visualLength(line);
  if (visibleLen <= maxWidth) return line;

  // Simple truncation: strip ANSI, truncate, re-add reset
  const stripped = stripAnsi(line);
  if (stripped.length <= maxWidth) return line;

  return `${RESET}${stripped.slice(0, maxWidth - 1)}…`;
}

/**
 * Render the statusline output from the given context.
 */
export function render(ctx: RenderContext): void {
  // Override layout based on terminal width if adaptive
  const effectiveLayout = resolveLayout(ctx);
  const effectiveCtx: RenderContext = {
    ...ctx,
    config: {
      ...ctx.config,
      lineLayout: effectiveLayout,
    },
  };

  const maxWidth = effectiveCtx.config.maxWidth;
  const lines: string[] = [];

  // Line 1: Main session info
  const sessionLine = renderSessionLine(effectiveCtx);
  if (sessionLine) {
    // Session line may contain newlines in expanded mode
    for (const subLine of sessionLine.split('\n')) {
      lines.push(truncateLine(subLine, maxWidth));
    }
  }

  // Context bar (Phase 3)
  if (effectiveCtx.config.display.showContextBar) {
    const contextLine = renderContextBar(effectiveCtx);
    if (contextLine) {
      lines.push(truncateLine(contextLine, maxWidth));
    }
  }

  // Line 2: Tool activity (Phase 2)
  const toolsLine = renderToolsLine(effectiveCtx);
  if (toolsLine) {
    lines.push(truncateLine(toolsLine, maxWidth));
  }

  // Line 3: Agent status (Phase 2)
  const agentsLine = renderAgentsLine(effectiveCtx);
  if (agentsLine) {
    lines.push(truncateLine(agentsLine, maxWidth));
  }

  // Line 4: Task progress (Phase 2)
  const todosLine = renderTodosLine(effectiveCtx);
  if (todosLine) {
    lines.push(truncateLine(todosLine, maxWidth));
  }

  // Output each line with ANSI reset
  for (const line of lines) {
    console.log(`${RESET}${line}`);
  }
}
