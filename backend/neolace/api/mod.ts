/**
 * This file contains all the common imports and helper methods needed to implement REST API endpoints.
 */
 import * as log from "std/log/mod.ts";
import { Drash } from "neolace/deps/drash.ts";
import { VNID } from "neolace/deps/vertex-framework.ts";
import * as api from "neolace/deps/neolace-api.ts";
import { InvalidFieldValue as _, InvalidRequest, InvalidRequestReason } from "neolace/deps/neolace-api.ts";

import { graph } from "neolace/core/graph.ts";
import { Check, CheckContext, permissions } from "neolace/core/permissions.ts";
import { siteCodeForSite, siteIdFromShortId } from "neolace/core/Site.ts";

interface AuthenticatedUserData {
    isBot: boolean,
    id: VNID,
    authnId: number|undefined,
    username: string
    email: string,
    fullName: string|null,
}

export class NeolaceHttpRequest extends Drash.Http.Request {
    user?: AuthenticatedUserData;
}
Drash.Http.Request = NeolaceHttpRequest;

type JsonCompatibleValue = string | boolean | Record<string, unknown> | null | undefined;

/**
 * Base class for defining a Neolace API resource.
 * 
 * A resource has a path like "/user/profile" and can have one or more methods (like POST, GET, etc.)
 */
export abstract class NeolaceHttpResource extends Drash.Http.Resource {
    // Override the type of this.request; Since we assigned NeolaceHttpRequest to the Drash.Http.Request global, this
    // will have the correct type.
    declare protected request: NeolaceHttpRequest;

    method<Response extends JsonCompatibleValue, RequestBody extends JsonCompatibleValue = undefined>(
        metadata: {
            responseSchema: api.schemas.Validator<Response>,
            requestBodySchema?: api.schemas.Validator<RequestBody>,
            description?: string,
            notes?: string,
        },
        fn: (bodyData: api.schemas.Type<api.schemas.Validator<RequestBody>>) => Promise<api.schemas.Type<api.schemas.Validator<Response>>>
    ) {
        return async (): Promise<Drash.Http.Response> => {
            const requestBodyValidated = metadata.requestBodySchema !== undefined ?
                // Validate the request body:
                // deno-lint-ignore no-explicit-any
                metadata.requestBodySchema(this.request.getAllBodyParams().data as any)
            : undefined;

            // deno-lint-ignore no-explicit-any
            this.response.body = metadata.responseSchema(await fn(requestBodyValidated as any));
            return this.response;
        };
    }

    // deno-lint-ignore no-explicit-any
    protected getRequestPayload<SchemaType extends (...args: any[]) => unknown>(schema: SchemaType): ReturnType<SchemaType> {
        // deno-lint-ignore no-explicit-any
        return schema(this.request.getAllBodyParams().data as any) as any;
    }

    /**
     * Get siteId and siteCode from the siteShortId parameter that's in the URL.
     * 
     * Most of our REST API methods include a human-readable "shortId" for the Site in the URL, like this:
     * https://api.neolace.com/site/braden/entry/fr-joel
     *                              ^^^^^^ - shortId is "braden", and so the full slugId would be "site-braden"
     * This helper function looks up the Site based on this shortId and returns the siteId (VNID) and siteCode (the code
     * used to give Entries for the site a slugId namespace).
     * 
     * This method will throw an exception if the site shortId is not in the URL or is not valid.
     * 
     * @param request The current REST API request
     * @returns 
     */
    protected async getSiteDetails(): Promise<{siteId: VNID, siteCode: string}> {
        const siteShortId = this.request.getPathParam("siteShortId");
        if (typeof siteShortId !== "string") {
            throw new Error("Expected the API endpoint URL to contain a siteShortId parameter.")
        }
        const siteId = await siteIdFromShortId(siteShortId);
        const siteCode = await siteCodeForSite(siteId);
        return {siteId, siteCode};
    }

    protected requireUser(): AuthenticatedUserData {
        const user = this.request.user;
        if (user === undefined) {
            throw new api.NotAuthenticated();
        }
        return user;
    }

    protected async requirePermission(check: Check, ...otherChecks: Check[]): Promise<void> {
        const siteId = this.request.getPathParam("siteShortId") ? (await this.getSiteDetails()).siteId : undefined;
        const userId = this.request.user?.id ?? undefined;
    
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
}



interface ConvertErrorPathToField {
    // deno-lint-ignore no-explicit-any
    (path: string, obj: any): string|undefined;
}

/**
 * Use this in a .catch() block after runAction() to catch any exceptions that may arise from trying to run
 * an action on the graph database, and convert those exceptions to REST API errors.
 */
export function adaptErrors(..._mapping: (string|ConvertErrorPathToField)[]) {
    // After an action is run on the graph database, but before it is committed, vertex framework will
    // validate all the fields of any changed models. If one of those fields is now invalid, we need to
    // map that error back to one of the request fields, if applicable.
    return function(err: unknown) {

        if (!(err instanceof Error)) {
            throw err;
        }

        convertStandardErrors(err);

        /*
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
        }*/

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
            throw new InvalidRequest(InvalidRequestReason.EmailAlreadyRegistered, "A user account is already registered with that email address.");
        }
    } else if (err.message.match(/The username ".*" is already taken./)) {
        throw new InvalidRequest(InvalidRequestReason.UsernameAlreadyRegistered, err.message);
    }
}

export {
    Drash,
    graph,
    api,
    permissions,
    log,
};
