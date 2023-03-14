/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */

/**
 * Redis is used for:
 *  - a cache
 *  - a temporary datastore (for things like email addresses that are pending validation and which have a timeout)
 *  - a message queue (e.g. for events that handlers can listen to - see "Redis Streams")
 *
 * Use 'await getRedis()' to get our connection to Redis.
 * See https://deno.land/x/redis for API docs.
 */
import { config } from "neolace/app/config.ts";
import { connect } from "neolace/deps/redis.ts";
import { defineStoppableResource } from "neolace/lib/stoppable.ts";

export const [getRedis, stopRedis] = defineStoppableResource(async () => {
    const redisConnection = await connect({
        hostname: config.redisHostname,
        maxRetryCount: 10,
        db: config.redisDatabaseNumber,
        password: config.redisPassword,
        port: config.redisPort,
    });
    return {
        resource: redisConnection,
        stopFn: async () => {
            redisConnection.close();
        },
    };
});

type SerializableValue = string | boolean | Record<string, unknown> | unknown[] | null;

export async function useRedisCache<T extends SerializableValue>(
    key: string,
    computeValue: () => Promise<T>,
): Promise<T> {
    key = `useRedisCache:` + key;
    const redis = await getRedis();
    const cachedValue = await redis.get(key);
    if (cachedValue !== null) {
        // We loaded the value from the cache
        return JSON.parse(cachedValue);
    }
    const newValue = await computeValue();
    const expirySeconds = 10; // TODO: This is an extremely low value (10 seconds) because we haven't implemented a way
    // to clear the cache. We need to update vertex framework to add post-action handlers.
    redis.set(key, JSON.stringify(newValue), { ex: expirySeconds });
    return newValue;
}
