import * as log from "std/log/mod.ts";
import { Drash } from "neolace/deps/drash.ts";
import { Cors } from "neolace/deps/drash-cors.ts";
import { config } from "neolace/app/config.ts";
import { neolaceAuthMiddleware } from "neolace/api/auth-middleware.ts";
import { allResources } from "neolace/api/resources.ts";
import { onShutDown } from "neolace/app/shutdown.ts";

let resolve = (): void => undefined, reject = (): void => undefined;
export const serverPromise = new Promise<void>((_resolve, _reject) => { resolve = _resolve; reject = _reject; });

(async () => {

    const server = new Drash.Http.Server({
        logger: new Drash.CoreLoggers.ConsoleLogger({enabled: true, level: "debug"}),
        response_output: "application/json",
        resources: allResources,
        middleware: {
            before_request: [
                neolaceAuthMiddleware,
            ],
            after_request: [
                Cors({
                    allowHeaders: ["Accept", "Authorization", "Content-Type", "If-None-Match"],
                }),
            ],
        },
    });

    await server.run({
        hostname: "0.0.0.0",
        port: config.port,
    });


    onShutDown(async () => { await server.close(); });
    log.info(`Neolace REST API server is now listening at ${server.hostname}:${server.port}`);
    resolve();

})().then(() => {
    /* quitting normally...*/
}).catch((err) => {
    log.error(err);
    reject();
});
