/**
 * CodeBuddy HUD - Agent Status Line Renderer
 *
 * Renders a line showing sub-agent execution status.
 *
 * Example:
 *   🤖 Agent: 2 active │ 3 completed
 *   🤖 Agent: "Explore codebase" │ "Read plan files"
 */

import type { RenderContext } from '../types.js';
import { colorize, dim } from './colors.js';

/**
 * Render the agent status line.
 */
export function renderAgentsLine(ctx: RenderContext): string | null {
  const { transcript, config } = ctx;

  if (!transcript || !config.display.showAgentsLine) return null;

  const { agentStatus } = transcript;

  // Only show when agents have been launched
  if (agentStatus.totalLaunched === 0) return null;

  const colors = config.colors;
  const parts: string[] = [];

  if (agentStatus.activeCount > 0) {
    // Show active agent descriptions
    for (const desc of agentStatus.activeDescriptions.slice(0, 2)) {
      parts.push(colorize(`▸ ${desc}`, colors.agentActive));
    }
    if (agentStatus.activeCount > 2) {
      parts.push(dim(`+${agentStatus.activeCount - 2} more`));
    }
  } else {
    // All agents completed
    parts.push(dim(`✓ ${agentStatus.completedCount} agent${agentStatus.completedCount !== 1 ? 's' : ''} done`));
  }

  if (parts.length === 0) return null;

  return parts.join(' │ ');
}
