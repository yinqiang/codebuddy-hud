/**
 * CodeBuddy HUD - Cache Module
 *
 * Simple TTL-based cache for git status and transcript data.
 * Avoids redundant operations during the ~300ms refresh cycle.
 */
export declare class TtlCache<T> {
    private store;
    private readonly defaultTtlMs;
    constructor(ttlMs?: number);
    get(key: string): T | undefined;
    set(key: string, value: T, ttlMs?: number): void;
    has(key: string): boolean;
    delete(key: string): boolean;
    clear(): void;
    get size(): number;
}
/** Git status cache (3s TTL — statusline refreshes every 300ms, so ~10 calls from cache) */
export declare const gitCache: TtlCache<unknown>;
/** Transcript summary cache is managed internally in transcript.ts */
//# sourceMappingURL=cache.d.ts.map