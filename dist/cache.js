/**
 * CodeBuddy HUD - Cache Module
 *
 * Simple TTL-based cache for git status and transcript data.
 * Avoids redundant operations during the ~300ms refresh cycle.
 */
export class TtlCache {
    store = new Map();
    defaultTtlMs;
    constructor(ttlMs = 2000) {
        this.defaultTtlMs = ttlMs;
    }
    get(key) {
        const entry = this.store.get(key);
        if (!entry)
            return undefined;
        if (Date.now() > entry.expiry) {
            this.store.delete(key);
            return undefined;
        }
        return entry.value;
    }
    set(key, value, ttlMs) {
        this.store.set(key, {
            value,
            expiry: Date.now() + (ttlMs ?? this.defaultTtlMs),
        });
    }
    has(key) {
        return this.get(key) !== undefined;
    }
    delete(key) {
        return this.store.delete(key);
    }
    clear() {
        this.store.clear();
    }
    get size() {
        return this.store.size;
    }
}
// ─── Singleton caches ───────────────────────────────────────────────
/** Git status cache (3s TTL — statusline refreshes every 300ms, so ~10 calls from cache) */
export const gitCache = new TtlCache(3000);
/** Transcript summary cache is managed internally in transcript.ts */
//# sourceMappingURL=cache.js.map