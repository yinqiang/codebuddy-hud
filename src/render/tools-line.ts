/**
 * CodeBuddy HUD - Tools Activity Line Renderer
 *
 * Renders a line showing active tool execution and
 * completed tool call statistics.
 *
 * Compact:  ⚡ Edit: session-line.ts │ ✓ Read ×3 │ ✓ Bash ×2
 * Expanded: Tools: ⚡ Edit: session-line.ts
 *           ✓ Read ×3 │ ✓ Bash ×2 │ ✓ Write ×1
 */

import type { RenderContext } from '../types.js';
import { colorize, dim } from './colors.js';
import { getStrings, t } from '../i18n.js';

// Shortened tool names for display
const TOOL_SHORT_NAMES: Record<string, Record<string, string>> = {
  en: {
    WebFetch: 'Fetch',
    WebSearch: 'Search',
    TaskCreate: 'Create',
    TaskUpdate: 'Update',
    TaskList: 'Tasks',
    ImageGen: 'ImgGen',
    ImageEdit: 'ImgEdit',
    EnterPlanMode: 'Plan→',
    ExitPlanMode: '←Plan',
  },
  zh: {
    WebFetch: '抓取',
    WebSearch: '搜索',
    TaskCreate: '新建',
    TaskUpdate: '更新',
    TaskList: '任务',
    ImageGen: '生图',
    ImageEdit: '改图',
    EnterPlanMode: '规划→',
    ExitPlanMode: '←规划',
    Read: '读',
    Write: '写',
    Edit: '编辑',
    Bash: '执行',
  },
};

function getToolDisplayName(toolName: string, lang: 'en' | 'zh'): string {
  return TOOL_SHORT_NAMES[lang]?.[toolName] ?? TOOL_SHORT_NAMES.en[toolName] ?? toolName;
}

/**
 * Render the tools activity line.
 */
export function renderToolsLine(ctx: RenderContext): string | null {
  const { transcript, config } = ctx;

  if (!transcript || !config.display.showToolsLine) return null;

  const { toolStats } = transcript;
  const colors = config.colors;
  const s = getStrings(config.language);
  const lang = config.language;

  const parts: string[] = [];

  // Active tool indicator
  if (toolStats.activeTool) {
    const toolName = toolStats.activeTool;
    const displayName = getToolDisplayName(toolName, lang);

    let activeStr = `⚡ ${displayName}`;
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
    const displayName = getToolDisplayName(toolName, lang);
    const countStr = count > 1 ? ` ×${count}` : '';
    parts.push(
      colorize(s.toolCompleted, colors.toolCompleted) + dim(` ${displayName}${countStr}`)
    );
  }

  if (parts.length === 0) return null;

  // Expanded layout: prefix with localized label
  if (config.lineLayout === 'expanded') {
    return dim(`${s.toolsLabel}: `) + parts.join(' │ ');
  }

  return parts.join(' │ ');
}
