/**
 * CodeBuddy HUD - Render Index
 *
 * Main rendering entry point. Assembles the statusline output
 * from the render context.
 */

import type { RenderContext } from '../types.js';
import { renderSessionLine } from './session-line.js';
import { RESET } from './colors.js';

/**
 * Render the statusline output from the given context.
 */
export function render(ctx: RenderContext): void {
  const lines: string[] = [];

  // Compact layout: single main line
  const sessionLine = renderSessionLine(ctx);
  if (sessionLine) {
    lines.push(sessionLine);
  }

  // Output each line with ANSI reset
  for (const line of lines) {
    console.log(`${RESET}${line}`);
  }
}
