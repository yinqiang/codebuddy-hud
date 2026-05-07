/**
 * CodeBuddy HUD - Cache Module
 *
 * Simple TTL-based cache for git status and transcript data.
 * Avoids redundant operations during the ~300ms refresh cycle.
 */

// ─── Generic TTL cache ──────────────────────────────────────────────

interface CacheEntry<T> {
  value: T;
  expiry: number;
}

export class TtlCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private readonly defaultTtlMs: number;

  constructor(ttlMs: number = 2000) {
    this.defaultTtlMs = ttlMs;
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    this.store.set(key, {
      value,
      expiry: Date.now() + (ttlMs ?? this.defaultTtlMs),
    });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

// ─── Singleton caches ───────────────────────────────────────────────

/** Git status cache (2s TTL) */
export const gitCache = new TtlCache<unknown>(2000);

/** Transcript summary cache is managed internally in transcript.ts */
