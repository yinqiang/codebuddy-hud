/**
 * CodeBuddy HUD - Render Index
 *
 * Main rendering entry point. Assembles the statusline output
 * from the render context, including Phase 2 multi-line output.
 */

import type { RenderContext } from '../types.js';
import { renderSessionLine } from './session-line.js';
import { renderToolsLine } from './tools-line.js';
import { renderAgentsLine } from './agents-line.js';
import { renderTodosLine } from './todos-line.js';
import { RESET } from './colors.js';

/**
 * Render the statusline output from the given context.
 */
export function render(ctx: RenderContext): void {
  const lines: string[] = [];

  // Line 1: Main session info
  const sessionLine = renderSessionLine(ctx);
  if (sessionLine) {
    lines.push(sessionLine);
  }

  // Line 2: Tool activity (Phase 2)
  const toolsLine = renderToolsLine(ctx);
  if (toolsLine) {
    lines.push(toolsLine);
  }

  // Line 3: Agent status (Phase 2)
  const agentsLine = renderAgentsLine(ctx);
  if (agentsLine) {
    lines.push(agentsLine);
  }

  // Line 4: Task progress (Phase 2)
  const todosLine = renderTodosLine(ctx);
  if (todosLine) {
    lines.push(todosLine);
  }

  // Output each line with ANSI reset
  for (const line of lines) {
    console.log(`${RESET}${line}`);
  }
}
