import * as Hapi from "@hapi/hapi";

import { config, environment } from "./app/config";
import { log } from "./app/log";
import { authnScheme } from "./core/auth/authn";
import { authnHooks } from "./core/auth/authn-hooks";
import { userRoutes } from "./core/User-rest";
import { onShutDown } from "./app/shutdown";

let resolve = (): void => undefined, reject = (): void => undefined;
export const serverPromise = new Promise<void>((_resolve, _reject) => { resolve = _resolve; reject = _reject; });

(async () => {
    const server = await new Hapi.Server({
        host: "0.0.0.0",
        port: config.port,
        routes: {
            cors: {
                origin: [config.frontendUrl],
                headers: ["Accept", "Authorization", "Content-Type", "If-None-Match"], // Headers that are allowed
                //exposedHeaders: ['Accept'],
                maxAge: (environment === "development" ? 240 : undefined),
                credentials: true,
            },
        },
        debug: { request: ["error"] },
    });

    // Log requests
    server.events.on("response", (request) => {
        const prefix = `${request.method.toUpperCase()} ${request.path}`;
        const response = request.response;
        if (response instanceof Error) {
            log.error(`${prefix}: ${request.response.message}`);
        } else {
            if (response.statusCode >= 400) {
                log.error(`${prefix}: ${response.statusCode}`);
            } else {
                log.debug(`${prefix}: ${response.statusCode} in ${request.info.responded - request.info.received}ms`);
            }
        }
    });

    // Configure authentication
    server.auth.scheme("technotes_scheme", authnScheme);
    server.auth.strategy("technotes_strategy", "technotes_scheme");

    // Configure routes
    server.route(authnHooks);
    server.route(userRoutes);

    // Simple home page
    server.route({
        method: "GET",
        path: "/",
        handler: (request, h) => {
            return `
                <html>
                    <head><title>Neolace API</title></head>
                    <body>
                        This is the <strong>neolace<strong> API.
                    </body>
                </html>
            `;
        },
    });

    await server.start();
    onShutDown(server.stop.bind(server));
    log(`Server listening at ${server.info.uri}`);
    resolve();

})().then(() => {
    /* quitting normally...*/
}).catch((err) => {
    log.error(err);
    reject();
});
