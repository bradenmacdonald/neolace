/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license MIT
 */

/**
 * A simple in-memory cache that can be used server-side or client side.
 *
 * Give it a function that can fetch any value based on its key.
 * When you first call get(...) for a given key, it will be fetched using the provided function.
 * On subsequent calls, get(...) will always immediately return the cached version, but after the configurable timeout,
 * the cache will asynchronously call the provided function and put the updated value into the cache.
 */
export class AsyncCache<KeyType, ValueType> {
    private fetcher: (key: KeyType) => Promise<ValueType>;
    private cache: Map<KeyType, ValueType> = new Map();
    private staleEntries: Set<KeyType> = new Set();
    private timeout: number;

    constructor(fetcher: (key: KeyType) => Promise<ValueType>, timeout = 5 * 60_000) {
        this.fetcher = fetcher;
        this.timeout = timeout;
    }

    async get(key: KeyType): Promise<ValueType> {
        if (this.cache.has(key)) {
            // This entry is already in the cache.
            // If the entry is stale, trigger a new update of the value asynchonrously, and immediately return the [stale] cached value
            if (this.staleEntries.has(key)) {
                // Mark the entry as un-stale temporarily to avoid multiple re-fetches:
                this.staleEntries.delete(key);
                this.fetcher(key).then((newValue) => this.cache.set(key, newValue)).catch((err) => {
                    // The entry could not be re-fetched; keep serving the stale version for now, but try fetching again very soon (one second)
                    setTimeout(() => this.staleEntries.add(key), 1_000);
                    console.error(`Unable to refresh cached value with key ${key}:`, err);
                });
            }
            return this.cache.get(key)!;
        } else {
            // This entry is not yet in the cache. Wait for it to be fetched and then return it.
            const newValue = await this.fetcher(key);
            this.cache.set(key, newValue);
            setTimeout(() => this.staleEntries.add(key), this.timeout);
            return newValue;
        }
    }
}
