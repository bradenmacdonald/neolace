import * as log from "std/log/mod.ts";
//import { InvalidFieldValue, InvalidRequest } from "neolace/deps/neolace-api.ts";
import { Drash } from "neolace/deps/drash.ts";
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
        },
    });

    // Log requests?
    /*server.events.on("response", (request) => {
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
    });*/

    // Configure authentication?
    /*
    server.auth.scheme("technotes_scheme", authnScheme);
    server.auth.strategy("technotes_strategy", "technotes_scheme");
    */

    /*
    // Configure our exceptions
    server.ext("onPreResponse", (request, h, err) => {
        if (request.response instanceof Boom.Boom && request.response.isServer) {
            // Note: here 'error' is the original error object, plus some Boom-specific annotations added by "boomify()".
            const origError = request.response;
            // Convert our API's InvalidRequest to the 400 format that Boom expects; the client will convert it
            // back to this InvalidRequest class or sublcass.
            if (origError instanceof InvalidRequest) {
                const newError = Boom.badRequest(origError.message);
                (newError.output.payload as any).reason = origError.reason;
                if (origError instanceof InvalidFieldValue) {
                    (newError.output.payload as any).fields = origError.fields;
                }
                return newError;
            }
        }
        return h.continue;
    });
    */
      
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
