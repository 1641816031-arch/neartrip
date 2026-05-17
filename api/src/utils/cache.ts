interface CacheEntry<V> {
  data: V;
  expiresAt: number;
}

export class Cache<K, V> {
  private store = new Map<K, CacheEntry<V>>();

  set(key: K, value: V, ttlMs: number): void {
    const expiresAt = Date.now() + ttlMs;
    this.store.set(key, { data: value, expiresAt });
  }

  get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.data;
  }

  delete(key: K): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

export const ticketCache = new Cache<string, any>();
export const weatherCache = new Cache<string, any>();
export const stationMapCache = new Cache<string, Map<string, string>>();
export const geoCache = new Cache<string, string>();
