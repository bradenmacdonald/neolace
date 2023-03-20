/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { log, NiceConsoleHandler } from "neolace/app/log.ts";
import { Drash } from "neolace/deps/drash.ts";
import { config } from "neolace/app/config.ts";
import { NeolaceAuthService } from "neolace/rest-api/auth-middleware.ts";
import { NeolaceErrorLogger, NeolaceLogService } from "neolace/rest-api/log-middleware.ts";
import { builtInRestApiResources } from "neolace/rest-api/resources.ts";
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
    // Configure logging:
    await log.setup({
        handlers: {
            console: new NiceConsoleHandler(config.debugLogging ? "DEBUG" : "INFO"),
        },
        loggers: {
            "default": { level: "DEBUG", handlers: ["console"] },
            "authn-deno": { level: "DEBUG", handlers: ["console"] },
            "neolace-sdk": { level: "DEBUG", handlers: ["console"] },
            "vertex-framework": { level: "DEBUG", handlers: ["console"] },
        },
    });
    // Start the REST API server
    await startServer();
}
