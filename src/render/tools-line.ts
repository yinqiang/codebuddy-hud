/**
 * CodeBuddy HUD - Tools Activity Line Renderer
 *
 * Renders a line showing active tool execution and
 * completed tool call statistics.
 *
 * Example:
 *   ◐ Edit: session-line.ts │ ✓ Read ×3 │ ✓ Bash ×2 │ ✓ Write ×1
 */

import type { RenderContext } from '../types.js';
import { colorize, dim } from './colors.js';

// Tool display names and icons
const TOOL_ICONS: Record<string, string> = {
  Read: '📖',
  Write: '✏️',
  Edit: '🔧',
  Bash: '⚡',
  WebFetch: '🌐',
  WebSearch: '🔍',
  Agent: '🤖',
  TaskCreate: '📋',
  TaskUpdate: '✅',
  TaskList: '📋',
  Skill: '🎯',
  ImageGen: '🖼️',
  ImageEdit: '🎨',
  EnterPlanMode: '📝',
  ExitPlanMode: '📝',
};

// Shortened tool names for display
const TOOL_SHORT_NAMES: Record<string, string> = {
  WebFetch: 'Fetch',
  WebSearch: 'Search',
  TaskCreate: 'Create',
  TaskUpdate: 'Update',
  TaskList: 'Tasks',
  ImageGen: 'ImgGen',
  ImageEdit: 'ImgEdit',
  EnterPlanMode: 'Plan→',
  ExitPlanMode: '←Plan',
};

/**
 * Render the tools activity line.
 */
export function renderToolsLine(ctx: RenderContext): string | null {
  const { transcript, config } = ctx;

  if (!transcript || !config.display.showToolsLine) return null;

  const { toolStats } = transcript;
  const colors = config.colors;

  const parts: string[] = [];

  // Active tool indicator
  if (toolStats.activeTool) {
    const toolName = toolStats.activeTool;
    const icon = TOOL_ICONS[toolName] ?? '⚙️';
    const displayName = TOOL_SHORT_NAMES[toolName] ?? toolName;

    let activeStr = `${icon} ${displayName}`;
    if (toolStats.activeToolDetail) {
      activeStr += `: ${toolStats.activeToolDetail}`;
    }
    parts.push(colorize(activeStr, colors.toolActive));
  }

  // Completed tool counts (sorted by count, top 5)
  const sortedTools = Array.from(toolStats.completedCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  for (const [toolName, count] of sortedTools) {
    const displayName = TOOL_SHORT_NAMES[toolName] ?? toolName;
    const countStr = count > 1 ? ` ×${count}` : '';
    parts.push(
      colorize(`✓`, colors.toolCompleted) + dim(` ${displayName}${countStr}`)
    );
  }

  if (parts.length === 0) return null;

  return parts.join(' │ ');
}
