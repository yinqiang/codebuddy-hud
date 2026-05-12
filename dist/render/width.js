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
export function isCjkAmbiguousWide() {
    const lang = process.env.LC_ALL ?? process.env.LC_CTYPE ?? process.env.LANG ?? '';
    return /zh|ja|ko|tw|cn/i.test(lang);
}
/**
 * Get the cell width of a single Unicode code point.
 */
export function codePointCellWidth(codePoint, ambiguousWide) {
    // Control characters
    if (codePoint < 0x20 || (codePoint >= 0x7F && codePoint < 0xA0))
        return 0;
    // CJK Unified Ideographs
    if (codePoint >= 0x4E00 && codePoint <= 0x9FFF)
        return 2;
    // CJK Extension A
    if (codePoint >= 0x3400 && codePoint <= 0x4DBF)
        return 2;
    // CJK Compatibility Ideographs
    if (codePoint >= 0xF900 && codePoint <= 0xFAFF)
        return 2;
    // CJK Extension B-I (supplementary planes)
    if (codePoint >= 0x20000 && codePoint <= 0x3FFFF)
        return 2;
    // Hangul Syllables
    if (codePoint >= 0xAC00 && codePoint <= 0xD7AF)
        return 2;
    // Halfwidth and Fullwidth Forms
    if (codePoint >= 0xFF01 && codePoint <= 0xFF60)
        return 2; // fullwidth
    if (codePoint >= 0xFF61 && codePoint <= 0xFFDC)
        return 1; // halfwidth
    // Katakana
    if (codePoint >= 0x30A0 && codePoint <= 0x30FF)
        return 2;
    // Hiragana
    if (codePoint >= 0x3040 && codePoint <= 0x309F)
        return 2;
    // CJK Symbols and Punctuation
    if (codePoint >= 0x3000 && codePoint <= 0x303F)
        return 2;
    // Korean Jamo
    if (codePoint >= 0x1100 && codePoint <= 0x11FF)
        return 2;
    if (codePoint >= 0x3130 && codePoint <= 0x318F)
        return 2;
    // East Asian Ambiguous width
    // These characters are width 1 in Western locales, width 2 in CJK locales
    if (ambiguousWide) {
        // Common ambiguous ranges
        if ((codePoint >= 0x00A1 && codePoint <= 0x00A1) ||
            (codePoint >= 0x00A4 && codePoint <= 0x00A4) ||
            (codePoint >= 0x00A7 && codePoint <= 0x00A8) ||
            (codePoint >= 0x00AA && codePoint <= 0x00AA) ||
            (codePoint >= 0x00AD && codePoint <= 0x00AE) ||
            (codePoint >= 0x00B0 && codePoint <= 0x00B4) ||
            (codePoint >= 0x00B6 && codePoint <= 0x00BA) ||
            (codePoint >= 0x00BC && codePoint <= 0x00BF) ||
            (codePoint >= 0x00C6 && codePoint <= 0x00C6) ||
            (codePoint >= 0x00D0 && codePoint <= 0x00D0) ||
            (codePoint >= 0x00D7 && codePoint <= 0x00D8) ||
            (codePoint >= 0x00DE && codePoint <= 0x00E1) ||
            (codePoint >= 0x00E6 && codePoint <= 0x00E6) ||
            (codePoint >= 0x2016 && codePoint <= 0x2017) ||
            (codePoint >= 0x2020 && codePoint <= 0x2021) ||
            (codePoint >= 0x2500 && codePoint <= 0x257F) || // Box Drawing
            (codePoint >= 0x2580 && codePoint <= 0x259F) || // Block Elements
            (codePoint >= 0x25A0 && codePoint <= 0x25FF) || // Geometric Shapes
            (codePoint >= 0x2600 && codePoint <= 0x27BF) // Miscellaneous Symbols
        ) {
            return 2;
        }
    }
    // Emoji ranges (typically double-width in terminals)
    if ((codePoint >= 0x1F600 && codePoint <= 0x1F64F) || // Emoticons
        (codePoint >= 0x1F300 && codePoint <= 0x1F5FF) || // Misc Symbols and Pictographs
        (codePoint >= 0x1F680 && codePoint <= 0x1F6FF) || // Transport and Map
        (codePoint >= 0x1F900 && codePoint <= 0x1F9FF) || // Supplemental Symbols
        (codePoint >= 0x1FA00 && codePoint <= 0x1FA6F) || // Chess Symbols
        (codePoint >= 0x1FA70 && codePoint <= 0x1FAFF) || // Symbols Extended-A
        (codePoint >= 0x2600 && codePoint <= 0x26FF) || // Misc Symbols
        (codePoint >= 0x2700 && codePoint <= 0x27BF) // Dingbats
    ) {
        return 2;
    }
    return 1;
}
/**
 * Calculate the visual cell width of a string (ignoring ANSI escape sequences).
 */
export function visualLength(str) {
    const ambiguousWide = isCjkAmbientWide();
    let width = 0;
    // Strip ANSI codes first
    const stripped = str.replace(/(?:\x1b\[[0-9;]*m|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\))/g, '');
    for (const char of stripped) {
        const codePoint = char.codePointAt(0);
        if (codePoint !== undefined) {
            width += codePointCellWidth(codePoint, ambiguousWide);
        }
        else {
            width += 1;
        }
    }
    return width;
}
// Typo fix: use correct function name
function isCjkAmbientWide() {
    return isCjkAmbiguousWide();
}
//# sourceMappingURL=width.js.map