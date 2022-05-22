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
