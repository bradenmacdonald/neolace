import * as log from "std/log/mod.ts";
import { Drash, CORSService } from "neolace/deps/drash.ts";
import { config } from "neolace/app/config.ts";
import { NeolaceAuthService } from "neolace/api/auth-middleware.ts";
import { allResources } from "neolace/api/resources.ts";
import { onShutDown } from "neolace/app/shutdown.ts";

let resolve = (): void => undefined, reject = (): void => undefined;
export const serverPromise = new Promise<void>((_resolve, _reject) => { resolve = _resolve; reject = _reject; });

(async () => {

    const hostname = "0.0.0.0";
    const port = config.port;
    const server = new Drash.Server({
        resources: allResources,
        services: [
            new NeolaceAuthService(),
            new CORSService({
                allowHeaders: ["Accept", "Authorization", "Content-Type", "If-None-Match"],
            }),
        ],
        hostname,
        port,
        protocol: "http",
    });

    await server.run();

    onShutDown(async () => { await server.close(); });
    log.info(`Neolace REST API server is now listening at ${hostname}:${port}`);
    resolve();

})().then(() => {
    /* quitting normally...*/
}).catch((err) => {
    log.error(err);
    reject();
});
