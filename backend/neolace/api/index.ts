import * as Hapi from "@hapi/hapi";
import * as Boom from "@hapi/boom";
import Joi from "joi";

import * as api from "neolace-api";

import { log } from "../app/log";
import { graph } from "../core/graph";
import { InvalidFieldValue, InvalidRequest, InvalidRequestReason } from "neolace-api";
import { Check, CheckContext, permissions } from "../core/permissions";

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


interface ConvertErrorPathToField {
    (path: string, obj: any): string|undefined;
}

/**
 * The only reliable way to check if an error is a Joi ValidationError, as vertex-framework may use a different version
 * of Joi whose Joi.ValidationError instances fail our isinstance(Joi.ValidationError) test.
 */
function isJoiValidationError(err: unknown): err is Joi.ValidationError {
    return Boolean(err) && (err as any).isJoi === true && (err as any).name === "ValidationError";
}

/**
 * Use this in a .catch() block after runAction() to catch any exceptions that may arise from trying to run
 * an action on the graph database, and convert those exceptions to REST API errors.
 */
export function adaptErrors(...mapping: (string|ConvertErrorPathToField)[]) {
    // After an action is run on the graph database, but before it is committed, vertex framework will
    // validate all the fields of any changed models. If one of those fields is now invalid, we need to
    // map that error back to one of the request fields, if applicable.
    return function(err: unknown) {

        if (!(err instanceof Error)) {
            throw err;
        }

        convertStandardErrors(err);

        if (isJoiValidationError(err)) {
            // This is a Joi validation error. We need to convert from model fields (like User 2 . email)
            // to fields in the request.
            const requestFields: string[] = [];
            err.details.forEach(d => {
                const path = d.path.join(".");
                let found = false;
                if (mapping.includes(path)) {
                    // The (POST) request contained a field that has exactly the same name as this model field; easy.
                    requestFields.push(path);
                    found = true;
                } else {
                    // If any of the values in "mapping" is a function mf(path, origObject) that returns a string
                    // telling us the request field responsible for this error, we use that:
                    for (const mf of mapping) {
                        if (typeof mf === "function") {
                            const requestField = mf(path, err._original);
                            if (requestField) {
                                requestFields.push(requestField);
                                found = true;
                                break;
                            }
                        }
                    }
                }
                if (!found) {
                    // We can't map this field into the request, so we have to raise a generic "Internal Server Error"
                    // instead of a "bad request fields" error.
                    log(`adaptErrors: Cannot map Joi.ValidationError back to request fields - unknown field has path "${path}" in error "${err}" (${JSON.stringify(err)})`);
                    throw err;
                }
            });
            throw new InvalidFieldValue(requestFields, `Invalid value given for ${requestFields.join(", ")}. Check the length, special characters used, and/or data type.`);
        }

        // We don't know what this error is - it will result in an "Internal Server Error"
        log.debug(`Error of type ${err.name} cannot be converted to InvalidRequest by adaptErrors() - will result in Internal Server Error.`);
        throw err;
    };
}
/**
 * Simple helper function for adaptErrors.
 * 
 * Example:
 *     .catch(adaptErrors(..., adaptErrors.remap("slugId", "username")))
 * The above example means that any errors in validting the "slugId" field should be remapped to the "username" field,
 * and the API consumer will see a message that the "username" field was invalid.
 */
adaptErrors.remap = (errorPath: string, requestPath: string) => (field: string) => field === errorPath ? requestPath : undefined;

function convertStandardErrors(err: Error): void {
    if (err.name === "Neo4jError") {
        if (err.message.match(/Node(.*) already exists with label `Human` and property `email`/)) {
            throw new InvalidRequest(InvalidRequestReason.Email_already_registered, "A user account is already registered with that email address.");
        }
    } else if (err.message.match(/The username ".*" is already taken./)) {
        throw new InvalidRequest(InvalidRequestReason.Username_already_registered, err.message);
    }
}

export async function requirePermission(request: Hapi.Request, check: Check, ...otherChecks: Check[]): Promise<void> {
    const siteId = request.params.siteId ?? undefined;
    const userId = request.auth.credentials.user?.id ?? undefined;

    const checksPassed = await graph.read(async tx => {
        const context: CheckContext = {tx, siteId, userId};
        for (const c of [check, ...otherChecks]) {
            if (await c(context) !== true) {
                return false;  // This check was not passed
            }
        }
        return true;  // All checks passed
    });

    if (!checksPassed) {

        if (userId === undefined) {
            // We don't know who this user is, so we don't know if they have permission or not.
            throw new api.NotAuthenticated();
        } else {
            // We know who this user is, and they're not allowed to do that.
            throw new api.NotAuthorized("You do not have sufficient permissions.");
        }
    }
}

export {
    Hapi,
    Boom,
    Joi,
    log,
    graph,
    api,
    defineEndpoint,
    permissions,
};
