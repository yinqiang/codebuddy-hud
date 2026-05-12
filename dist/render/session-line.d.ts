/**
 * CodeBuddy HUD - Session Line Renderer
 *
 * Renders the main statusline with model, project, git,
 * duration, cost, and code stats.
 * Supports compact (single-line) and expanded (multi-line) layouts.
 */
import type { RenderContext } from '../types.js';
/**
 * Format milliseconds to human-readable duration string.
 */
export declare function formatDuration(ms: number, lang?: 'en' | 'zh'): string;
/**
 * Render the main session line for compact layout.
 */
export declare function renderSessionLine(ctx: RenderContext): string;
//# sourceMappingURL=session-line.d.ts.map