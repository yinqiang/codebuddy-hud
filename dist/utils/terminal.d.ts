/**
 * CodeBuddy HUD - Terminal Utilities
 *
 * Terminal width detection for responsive layout.
 */
export declare const UNKNOWN_TERMINAL_WIDTH = -1;
/**
 * Detect terminal width from various sources.
 */
export declare function getTerminalWidth(options?: {
    preferEnv?: boolean;
    fallback?: number;
}): number;
/**
 * Get adaptive bar width based on terminal width.
 */
export declare function getAdaptiveBarWidth(terminalWidth?: number): number;
//# sourceMappingURL=terminal.d.ts.map