import * as log from "std/log/mod.ts";
import { Drash } from "neolace/deps/drash.ts";
import { config } from "neolace/app/config.ts";
import { NeolaceAuthService } from "neolace/api/auth-middleware.ts";
import { NeolaceErrorLogger, NeolaceLogService } from "neolace/api/log-middleware.ts";
import { builtInRestApiResources } from "neolace/api/resources.ts";
import { getPlugins } from "neolace/plugins/loader.ts";
import { defineStoppableResource } from "neolace/lib/stoppable.ts";

export const [startServer, stopServer] = defineStoppableResource(async () => {
    // First see if any plugins are adding resources:
    const plugins = await getPlugins();
    const pluginResources = plugins.map((p) => p.restApiResources ?? []).flat();

    const hostname = "[::]"; // Bind to all addresses on IPv4 and IPv6
    const port = config.port;
    const server = new Drash.Server({
        resources: [...builtInRestApiResources, ...pluginResources],
        services: [
            new NeolaceAuthService(),
            new NeolaceLogService(),
        ],
        hostname,
        port,
        protocol: "http",
        error_handler: NeolaceErrorLogger,
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
