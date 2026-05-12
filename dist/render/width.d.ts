/**
 * CodeBuddy HUD - CJK & Emoji Width Calculation
 *
 * Handles terminal cell width for CJK characters and emoji,
 * ensuring correct alignment in statusline output.
 */
/**
 * Check if the current environment likely uses CJK ambiguous-wide rendering.
 * Most CJK locales (zh, ja, ko) render East Asian Ambiguous characters as 2 cells.
 */
export declare function isCjkAmbiguousWide(): boolean;
/**
 * Get the cell width of a single Unicode code point.
 */
export declare function codePointCellWidth(codePoint: number, ambiguousWide: boolean): number;
/**
 * Calculate the visual cell width of a string (ignoring ANSI escape sequences).
 */
export declare function visualLength(str: string): number;
//# sourceMappingURL=width.d.ts.map