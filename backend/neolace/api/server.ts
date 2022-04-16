import * as log from "std/log/mod.ts";
import { Drash } from "neolace/deps/drash.ts";
import { config } from "neolace/app/config.ts";
import { NeolaceAuthService } from "neolace/api/auth-middleware.ts";
import { builtInRestApiResources } from "neolace/api/resources.ts";
import { getPlugins } from "neolace/plugins/loader.ts";
import { defineStoppableResource } from "neolace/lib/stoppable.ts";

export const [startServer, stopServer] = defineStoppableResource(async () => {
    // First see if any plugins are adding resources:
    const plugins = await getPlugins();
    const pluginResources = plugins.map((p) => p.restApiResources ?? []).flat();

    const hostname = "0.0.0.0";
    const port = config.port;
    const server = new Drash.Server({
        resources: [...builtInRestApiResources, ...pluginResources],
        services: [
            new NeolaceAuthService(),
        ],
        hostname,
        port,
        protocol: "http",
    });

    await server.run();
    log.info(`Neolace REST API server is now listening at ${hostname}:${port}`);
    return {
        resource: server,
        stopFn: () => server.close(), /*.then(() => { log.info(`Server stopped`); })*/
    };
});

if (import.meta.main) {
    await startServer();
}
