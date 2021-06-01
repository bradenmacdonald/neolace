/**
 * Simple and performant in-memory cache that will keep a reasonable level of memory usage by evicting old/unused
 * entries as needed.
 * 
 * Based on https://stackoverflow.com/a/46432113 by odinho/Velmont
 */
export class LruCache<KeyType, ValueType> {
    readonly maxSize: number;
    #cache: Map<KeyType, ValueType>;

    constructor(maxSize = 1_000) {
        this.maxSize = maxSize;
        this.#cache = new Map<KeyType, ValueType>();
    }

    get(key: KeyType): ValueType|undefined {
        const item = this.#cache.get(key);
        if (item !== undefined) {
            // refresh key
            this.#cache.delete(key);
            this.#cache.set(key, item);
        }
        return item;
    }

    set(key: KeyType, val: ValueType): void {
        if (this.#cache.has(key)) {
            // refresh key
            this.#cache.delete(key);
        } else if (this.#cache.size >= this.maxSize) {
            // evict oldest
            this.#cache.delete(this.oldestKey());
        }
        this.#cache.set(key, val);
    }

    async cachedResult(key: KeyType, fn: (key: KeyType) => ValueType|Promise<ValueType>): Promise<ValueType> {
        const cachedValue = this.get(key);
        if (cachedValue !== undefined) {
            return cachedValue;  // The value was found in the cache, everyone is happy.
        } else if (this.#cache.has(key)) {
            return undefined as any as ValueType;  // This should be rare, but the value may actually be "undefined" 
        }
        // We need to use the expensive function to compute the value.
        const value = await fn(key);
        this.set(key, value);
        return value;
    }

    private oldestKey(): KeyType {
        return this.#cache.keys().next().value;
    }
}
