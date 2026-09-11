/**
 * CodeBuddy HUD - Context Usage Bar Renderer
 *
 * Renders a visual context usage indicator showing
 * token usage vs. context window capacity.
 */

import type { RenderContext, ContextValueMode } from '../types.js';
import { getStrings } from '../i18n.js';
import { dim } from './colors.js';

const DEFAULT_VALUE_MODE: ContextValueMode = 'percent';

/** Color thresholds (percentage) */
const COLOR_GREEN = 0;
const COLOR_YELLOW = 60;
const COLOR_RED = 85;

function usageColor(percent: number): (s: string) => string {
  if (percent >= COLOR_RED) return (s: string) => `\x1b[31m${s}\x1b[0m`; // red
  if (percent >= COLOR_YELLOW) return (s: string) => `\x1b[33m${s}\x1b[0m`; // yellow
  return (s: string) => `\x1b[32m${s}\x1b[0m`; // green
}

/** Cache hit rate color: green when warm, dim when the cache is mostly cold. */
function cacheColor(rate: number): (s: string) => string {
  if (rate >= 0.5) return (s: string) => `\x1b[32m${s}\x1b[0m`; // green
  if (rate >= 0.2) return (s: string) => `\x1b[33m${s}\x1b[0m`; // yellow
  return (s: string) => `\x1b[2m${s}\x1b[0m`; // dim
}

function formatTokens(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function formatHitRate(rate: number): string {
  const percent = rate * 100;
  // Never round a near-perfect rate up to 100%
  if (percent >= 99.95 && percent < 100) return '99.9%';
  return `${percent.toFixed(1)}%`;
}

/**
 * Render the context usage bar.
 * Returns empty string if no usage data is available.
 */
export function renderContextBar(ctx: RenderContext): string {
  const { transcript, config } = ctx;
  if (!transcript) return '';
  const usage = transcript.contextUsage;
  if (!usage) return '';

  const s = getStrings(config.language);
  const mode: ContextValueMode = config.contextBar.mode ?? DEFAULT_VALUE_MODE;

  const percent = usage.percentUsed;
  const hasWindow = usage.contextWindow > 0;

  // Build the visual progress bar (10 chars wide)
  const barWidth = 10;
  const filled = hasWindow ? Math.round((percent / 100) * barWidth) : 0;
  const bar = usageColor(percent)(
    '▐' + '█'.repeat(Math.min(filled, barWidth)) + '░'.repeat(Math.max(barWidth - filled, 0)) + '▌'
  );

  // Build label based on mode
  const parts: string[] = [];

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
  } else {
    // No context window info, just show tokens used
    parts.push(`⚡ ${formatTokens(usage.totalTokens)} tokens`);
  }

  // Prompt cache hit rate (appended when the usage data carries cache fields)
  if (config.contextBar.showCacheHit && usage.cacheHitRate >= 0) {
    parts.push(`${dim(s.cacheHit)} ${cacheColor(usage.cacheHitRate)(formatHitRate(usage.cacheHitRate))}`);
  }

  return parts.join(' │ ');
}
