/**
 * CodeBuddy HUD - Agent Status Line Renderer
 *
 * Renders a line showing sub-agent execution status.
 *
 * Compact:  🤖 Agent: 2 active │ 3 completed
 * Expanded: Agents: ▸ "Explore codebase" │ ▸ "Read plan files"
 */

import type { RenderContext } from '../types.js';
import { colorize, dim } from './colors.js';
import { getStrings, t } from '../i18n.js';

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
  const s = getStrings(config.language);
  const parts: string[] = [];

  if (agentStatus.activeCount > 0) {
    // Show active agent descriptions
    for (const desc of agentStatus.activeDescriptions.slice(0, 2)) {
      parts.push(colorize(`${s.agentActive} ${desc}`, colors.agentActive));
    }
    if (agentStatus.activeCount > 2) {
      parts.push(dim(t(s.agentMore, { n: agentStatus.activeCount - 2 })));
    }
  } else {
    // All agents completed
    parts.push(dim(t(s.agentDone, {
      n: agentStatus.completedCount,
      s: agentStatus.completedCount !== 1 ? 's' : '',
    })));
  }

  if (parts.length === 0) return null;

  // Expanded layout: prefix with localized label
  if (config.lineLayout === 'expanded') {
    return dim(`${s.agentsLabel}: `) + parts.join(' │ ');
  }

  return parts.join(' │ ');
}
