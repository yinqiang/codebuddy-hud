/**
 * CodeBuddy HUD - Color Utilities
 *
 * ANSI color code helpers for terminal output.
 */
export declare const RESET = "\u001B[0m";
export declare const BOLD = "\u001B[1m";
export declare const DIM = "\u001B[2m";
export declare function colorize(text: string, colorName?: string): string;
export declare function dim(text: string): string;
export declare function bold(text: string): string;
export declare function model(text: string, colors?: Record<string, string>): string;
export declare function project(text: string, colors?: Record<string, string>): string;
export declare function git(text: string, colors?: Record<string, string>): string;
export declare function gitBranch(text: string, colors?: Record<string, string>): string;
export declare function cost(text: string, colors?: Record<string, string>): string;
export declare function label(text: string, colors?: Record<string, string>): string;
export declare function coloredBar(percent: number, width?: number, options?: {
    color?: string;
    warningColor?: string;
    criticalColor?: string;
    warningThreshold?: number;
    criticalThreshold?: number;
}): string;
export declare function stripAnsi(str: string): string;
//# sourceMappingURL=colors.d.ts.map