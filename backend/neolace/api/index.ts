import * as Hapi from "@hapi/hapi";
import * as Boom from "@hapi/boom";
import * as Joi from "@hapi/joi";

import * as api from "neolace-api";

import { log } from "../app/log";
import { graph } from "../core/graph";

// This should only be imported from the "api/endpoints" file, to ensure that all API endpoints get registered.
export const ____allApiEndpoints: Hapi.ServerRoute[] = [];

function defineEndpoint(filename: string, ...details: Omit<Hapi.ServerRoute, "path">[]): void {
    // Automatically detect the path of this API endpoint, based on its TypeScript/JavaScript file name:
    let path = filename.substr(filename.indexOf("neolace/api") + 11);
    if (path.endsWith(".ts") || path.endsWith(".js")) {
        path = path.substr(0, path.length - 3)
    } else { throw new Error(`Unexpected __filename for REST API endpoint: "${filename}"`); }
    if (path.endsWith("/index")) {
        path = path.substr(0, path.length - 6);
    }
    log.debug(`Registering API route: ${path} from ${filename}`);
    details.forEach(route => ____allApiEndpoints.push({...route, path}));
}


export {
    Hapi,
    Boom,
    Joi,
    log,
    graph,
    api,
    defineEndpoint,
};
