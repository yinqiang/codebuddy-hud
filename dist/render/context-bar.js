/**
 * CodeBuddy HUD - Context Usage Bar Renderer
 *
 * Renders a visual context usage indicator showing
 * token usage vs. context window capacity.
 */
import { getStrings } from '../i18n.js';
const DEFAULT_VALUE_MODE = 'percent';
/** Color thresholds (percentage) */
const COLOR_GREEN = 0;
const COLOR_YELLOW = 60;
const COLOR_RED = 85;
function usageColor(percent) {
    if (percent >= COLOR_RED)
        return (s) => `\x1b[31m${s}\x1b[0m`; // red
    if (percent >= COLOR_YELLOW)
        return (s) => `\x1b[33m${s}\x1b[0m`; // yellow
    return (s) => `\x1b[32m${s}\x1b[0m`; // green
}
function formatTokens(n) {
    if (n >= 1000000)
        return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000)
        return `${(n / 1000).toFixed(1)}k`;
    return String(n);
}
/**
 * Render the context usage bar.
 * Returns empty string if no usage data is available.
 */
export function renderContextBar(ctx) {
    const { transcript, config } = ctx;
    if (!transcript)
        return '';
    const usage = transcript.contextUsage;
    if (!usage)
        return '';
    const s = getStrings(config.language);
    const mode = config.contextValueMode ?? DEFAULT_VALUE_MODE;
    const percent = usage.percentUsed;
    const hasWindow = usage.contextWindow > 0;
    // Build the visual progress bar (10 chars wide)
    const barWidth = 10;
    const filled = hasWindow ? Math.round((percent / 100) * barWidth) : 0;
    const bar = usageColor(percent)('▐' + '█'.repeat(Math.min(filled, barWidth)) + '░'.repeat(Math.max(barWidth - filled, 0)) + '▌');
    // Build label based on mode
    const parts = [];
    if (hasWindow) {
        switch (mode) {
            case 'percent':
                parts.push(`${bar} ${percent}%`);
                break;
            case 'tokens':
                parts.push(`${bar} ${formatTokens(usage.totalTokens)}/${formatTokens(usage.contextWindow)}`);
                break;
            case 'remaining':
                {
                    const rem = usage.contextWindow - usage.totalTokens;
                    parts.push(`${bar} ${formatTokens(Math.max(rem, 0))} left`);
                }
                break;
            case 'both':
                parts.push(`${bar} ${percent}% (${formatTokens(usage.totalTokens)}/${formatTokens(usage.contextWindow)})`);
                break;
        }
    }
    else {
        // No context window info, just show tokens used
        parts.push(`⚡ ${formatTokens(usage.totalTokens)} tokens`);
    }
    return parts.join(' ');
}
//# sourceMappingURL=context-bar.js.map