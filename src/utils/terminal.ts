/**
 * CodeBuddy HUD - Terminal Utilities
 *
 * Terminal width detection for responsive layout.
 */

import * as fs from 'node:fs';

export const UNKNOWN_TERMINAL_WIDTH = -1;

/**
 * Detect terminal width from various sources.
 */
export function getTerminalWidth(options?: {
  preferEnv?: boolean;
  fallback?: number;
}): number {
  const { preferEnv = true, fallback = UNKNOWN_TERMINAL_WIDTH } = options ?? {};

  // 1. COLUMNS environment variable (most reliable in statusline context)
  if (preferEnv) {
    const envCols = process.env.COLUMNS;
    if (envCols) {
      const n = parseInt(envCols, 10);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }

  // 2. process.stdout.columns
  if (process.stdout.columns && process.stdout.columns > 0) {
    return process.stdout.columns;
  }

  // 3. Try /dev/tty on Unix
  if (process.platform !== 'win32') {
    try {
      const { execSync } = require('node:child_process') as typeof import('node:child_process');
      const result = execSync('tput cols 2>/dev/tty', { encoding: 'utf8', timeout: 500 });
      const n = parseInt(result.trim(), 10);
      if (Number.isFinite(n) && n > 0) return n;
    } catch {
      // Ignore
    }
  }

  return fallback;
}

/**
 * Get adaptive bar width based on terminal width.
 */
export function getAdaptiveBarWidth(terminalWidth?: number): number {
  const width = terminalWidth ?? getTerminalWidth();
  if (width === UNKNOWN_TERMINAL_WIDTH || width <= 0) return 10;
  if (width < 60) return 5;
  if (width < 100) return 8;
  return 10;
}
