import * as log from "std/log/mod.ts";
import { CORSService, Drash } from "neolace/deps/drash.ts";
import { config } from "neolace/app/config.ts";
import { NeolaceAuthService } from "neolace/api/auth-middleware.ts";
import { builtInRestApiResources } from "neolace/api/resources.ts";
import { onShutDown } from "neolace/app/shutdown.ts";
import { getPlugins } from "neolace/plugins/loader.ts";

let resolve = (): void => undefined, reject = (): void => undefined;
export const serverPromise = new Promise<void>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
});

(async () => {
    // First see if any plugins are adding resources:
    const plugins = await getPlugins();
    const pluginResources = plugins.map((p) => p.restApiResources ?? []).flat();

    const hostname = "0.0.0.0";
    const port = config.port;
    const server = new Drash.Server({
        resources: [...builtInRestApiResources, ...pluginResources],
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

    onShutDown(async () => {
        await server.close();
    });
    log.info(`Neolace REST API server is now listening at ${hostname}:${port}`);
    resolve();
})().then(() => {
    /* quitting normally...*/
}).catch((err) => {
    log.error(err);
    reject();
});
