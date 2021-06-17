import { suite, test, assert, beforeEach, setTestIsolation, assertRejects } from "../lib/intern-tests";
import { LruCache } from "./lru-cache";

suite(__filename, () => {

    test("Basic LRU cache test", () => {
        const cache = new LruCache<number, string>(3);
        [1, 2, 3, 4, 5].forEach(v => cache.set(v, `v:${v}`));
        assert.strictEqual(cache.get(2), undefined);
        assert.strictEqual(cache.get(3), "v:3");
        cache.set(6, "value6");
        assert.strictEqual(cache.get(4), undefined);
        assert.strictEqual(cache.get(3), "v:3");
    });

    test("cachedResult", async () => {
        type ValueType = {name: string, age: number};
        const expensiveData: {[k: string]: ValueType} = {
            "bobbie": {name: "Bobbie", age: 32},
            "jamie": {name: "Jamie", age: 16},
            "alex": {name: "alex", age: 57},
            "ash": {name: "ash", age: 63},
        };
        let numCalls = 0;
        const expensiveFn = (key: string): ValueType => { numCalls++; return expensiveData[key]; } 
        const expensiveFnAsync = async (key: string): Promise<ValueType> => { numCalls++; return expensiveData[key]; } 
        
        const cache = new LruCache<string, ValueType>(3);


        await cache.cachedResult("alex", expensiveFn).then(result => {
            assert.deepStrictEqual(result, expensiveData.alex);
        });
        assert.deepStrictEqual(numCalls, 1);
        // Now if we request the same key, there should be no new calls to the expensive function:
        await cache.cachedResult("alex", expensiveFn).then(result => {
            assert.deepStrictEqual(result, expensiveData.alex);
        });
        assert.deepStrictEqual(numCalls, 1);


        // Test loading data using a promise:
        await cache.cachedResult("ash", expensiveFnAsync).then(result => {
            assert.deepStrictEqual(result, expensiveData.ash);
        });
        assert.deepStrictEqual(numCalls, 2);

        // Now load more data, saturating the cache and causing one eviction:
        await cache.cachedResult("jamie", expensiveFn);  // cache miss
        await cache.cachedResult("alex", expensiveFn);  // cache HIT
        await cache.cachedResult("bobbie", expensiveFn);  // cache miss, evict ash
        assert.deepStrictEqual(numCalls, 4);  // Only two more expensive calls were made (one cache hit, two misses)
        // Now ash should be evicted
        await cache.cachedResult("ash", expensiveFn);
        assert.deepStrictEqual(numCalls, 5);
    });
});
