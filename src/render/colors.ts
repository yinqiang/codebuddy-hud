/**
 * CodeBuddy HUD - Color Utilities
 *
 * ANSI color code helpers for terminal output.
 */

// ─── ANSI escape sequences ──────────────────────────────────────────

export const RESET = '\x1b[0m';
export const BOLD = '\x1b[1m';
export const DIM = '\x1b[2m';

const ANSI_CODES: Record<string, string> = {
  black: '\x1b[0;30m',
  red: '\x1b[0;31m',
  green: '\x1b[0;32m',
  yellow: '\x1b[0;33m',
  blue: '\x1b[0;34m',
  magenta: '\x1b[0;35m',
  cyan: '\x1b[0;36m',
  white: '\x1b[0;37m',
  brightRed: '\x1b[1;31m',
  brightGreen: '\x1b[1;32m',
  brightYellow: '\x1b[1;33m',
  brightBlue: '\x1b[1;34m',
  brightMagenta: '\x1b[1;35m',
  brightCyan: '\x1b[1;36m',
  brightWhite: '\x1b[1;37m',
  dim: '\x1b[2m',
};

// ─── Color application functions ────────────────────────────────────

function resolveColorCode(colorName: string): string {
  // Named preset
  if (ANSI_CODES[colorName]) return ANSI_CODES[colorName];

  // 256-color index (numeric string)
  if (/^\d+$/.test(colorName)) {
    return `\x1b[38;5;${colorName}m`;
  }

  // Hex color (#rrggbb)
  if (/^#[0-9a-fA-F]{6}$/.test(colorName)) {
    const r = parseInt(colorName.slice(1, 3), 16);
    const g = parseInt(colorName.slice(3, 5), 16);
    const b = parseInt(colorName.slice(5, 7), 16);
    return `\x1b[38;2;${r};${g};${b}m`;
  }

  return '';
}

export function colorize(text: string, colorName?: string): string {
  if (!colorName) return text;
  const code = resolveColorCode(colorName);
  if (!code) return text;
  return `${code}${text}${RESET}`;
}

export function dim(text: string): string {
  return `${DIM}${text}${RESET}`;
}

export function bold(text: string): string {
  return `${BOLD}${text}${RESET}`;
}

// ─── Semantic color helpers ─────────────────────────────────────────

export function model(text: string, colors?: Record<string, string>): string {
  return colorize(text, colors?.model ?? 'cyan');
}

export function project(text: string, colors?: Record<string, string>): string {
  return colorize(text, colors?.project ?? 'yellow');
}

export function git(text: string, colors?: Record<string, string>): string {
  return colorize(text, colors?.git ?? 'magenta');
}

export function gitBranch(text: string, colors?: Record<string, string>): string {
  return colorize(text, colors?.gitBranch ?? 'cyan');
}

export function cost(text: string, colors?: Record<string, string>): string {
  return colorize(text, colors?.cost ?? 'green');
}

export function label(text: string, colors?: Record<string, string>): string {
  return colorize(text, colors?.label ?? 'dim');
}

// ─── Visual progress bar ────────────────────────────────────────────

export function coloredBar(
  percent: number,
  width: number = 10,
  options?: {
    color?: string;
    warningColor?: string;
    criticalColor?: string;
    warningThreshold?: number;
    criticalThreshold?: number;
  },
): string {
  const {
    color = 'green',
    warningColor = 'yellow',
    criticalColor = 'red',
    warningThreshold = 70,
    criticalThreshold = 85,
  } = options ?? {};

  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;

  let barColor: string;
  if (percent >= criticalThreshold) {
    barColor = criticalColor;
  } else if (percent >= warningThreshold) {
    barColor = warningColor;
  } else {
    barColor = color;
  }

  const filledChar = colorize('█'.repeat(Math.max(0, filled)), barColor);
  const emptyChar = dim('░'.repeat(Math.max(0, empty)));

  return `${filledChar}${emptyChar}`;
}

// ─── Strip ANSI for width calculations ──────────────────────────────

const ANSI_ESCAPE_GLOBAL = /(?:\x1b\[[0-9;]*m|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\))/g;

export function stripAnsi(str: string): string {
  return str.replace(ANSI_ESCAPE_GLOBAL, '');
}
