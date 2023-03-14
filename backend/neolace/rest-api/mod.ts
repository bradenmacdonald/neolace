/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */

/**
 * This file contains all the common imports and helper methods needed to implement REST API endpoints.
 */
import * as log from "std/log/mod.ts";
import { Drash } from "neolace/deps/drash.ts";
import { EmptyResultError, FieldValidationError, SYSTEM_VNID, VNID } from "neolace/deps/vertex-framework.ts";
import * as SDK from "neolace/deps/neolace-sdk.ts";
import { PathError } from "neolace/deps/computed-types.ts";

import { getGraph } from "neolace/core/graph.ts";
import { ActionObject, ActionSubject } from "neolace/core/permissions/action.ts";
import { hasPermission } from "neolace/core/permissions/check.ts";
import { getHomeSite, siteIdFromKey } from "neolace/core/Site.ts";

interface AuthenticatedUserData {
    isBot: boolean;
    id: VNID;
    authnId: number | undefined;
    username: string;
    email: string;
    fullName: string | null;
}

export type NeolaceHttpRequest = Drash.Request & {
    user?: AuthenticatedUserData;
};

type JsonCompatibleValue = string | boolean | Record<string, unknown> | null | undefined;

/**
 * Base class for defining a Neolace API resource.
 *
 * A resource has a path like "/user/profile" and can have one or more methods (like POST, GET, etc.)
 */
export class NeolaceHttpResource extends Drash.Resource {
    method<Response extends JsonCompatibleValue, RequestBody extends JsonCompatibleValue = undefined>(
        metadata: {
            responseSchema: SDK.schemas.Validator<Response>;
            requestBodySchema?: SDK.schemas.Validator<RequestBody>;
            description?: string;
            notes?: string;
        },
        fn: (
            args: {
                request: NeolaceHttpRequest;
                response: Drash.Response;
                bodyData: SDK.schemas.Type<SDK.schemas.Validator<RequestBody>>;
            },
        ) => Promise<SDK.schemas.Type<SDK.schemas.Validator<Response>>>,
    ) {
        return async (request: Drash.Request, response: Drash.Response): Promise<void> => {
            this.setCorsHeaders(request, response);
            try {
                // Validate the request body, if any:
                const requestBodyValidated = this.validateRequestBody(request, metadata.requestBodySchema);

                // Run the request:
                const responseBodyValidated = metadata.responseSchema(
                    await fn({ request, response, bodyData: requestBodyValidated }),
                );
                if (typeof responseBodyValidated !== "object" || responseBodyValidated === null) {
                    throw new Error(
                        `Expected API implementation to return an object, not ${typeof responseBodyValidated}`,
                    );
                }
                response.json(responseBodyValidated);
            } catch (err: unknown) {
                // Log errors as structured JSON objects
                if (err instanceof SDK.ApiError) {
                    response.status = err.statusCode;
                    const errorData: Record<string, unknown> = { message: err.message };
                    let logMessage = err.message;
                    if (err instanceof SDK.InvalidRequest) {
                        errorData.reason = err.reason;
                        logMessage = `${err.reason} ` + logMessage;
                    }
                    if (err instanceof SDK.InvalidEdit) {
                        errorData.context = err.context;
                        logMessage += ` (context: ${JSON.stringify(err.context)})`;
                    }
                    if (err instanceof SDK.InvalidFieldValue) {
                        errorData.fieldErrors = err.fieldErrors;
                        logMessage += ` (fieldErrors: ${JSON.stringify(err.fieldErrors)})`;
                    }
                    response.json(errorData);
                    log.warning(`Returned error response: ${logMessage}`);
                } else {
                    response.status = 500;
                    response.json({ message: "An internal error occurred" });
                    log.warning(`Returned "Internal error" response`);
                    log.error(err);
                }
            }
        };
    }

    protected setCorsHeaders(request: Drash.Request, response: Drash.Response) {
        const allHttpMethods: string[] = ["GET", "POST", "PUT", "DELETE"];
        response.headers.set("Access-Control-Allow-Methods", allHttpMethods.filter((m) => m in this).join());
        // Neolace APIs are generally public and don't directly use cookies for authentication so we allow all origins
        response.headers.set("Access-Control-Allow-Origin", request.headers.get("Origin") ?? "");
        response.headers.set(
            "Access-Control-Allow-Headers",
            ["Accept", "Authorization", "Content-Type", "If-None-Match"].join(","),
        );
        // Note: we also have some code in the error handler (NeolaceErrorLogger) to set the Allow-Origin CORS header
        // in the case where an exception is thrown by the auth middleware before this class comes into play.
    }

    public OPTIONS(request: Drash.Request, response: Drash.Response) {
        this.setCorsHeaders(request, response);
        response.status = 204;
    }

    private validateRequestBody<DataShape>(
        request: NeolaceHttpRequest,
        schema?: SDK.schemas.Validator<DataShape>,
    ): SDK.schemas.Type<SDK.schemas.Validator<DataShape>> {
        if (schema === undefined) {
            // deno-lint-ignore no-explicit-any
            return undefined as any;
        }
        try {
            // deno-lint-ignore no-explicit-any
            return schema(request.bodyAll()) as any;
        } catch (validationError) {
            // Convert schema validation errors to the format our API uses.
            // deno-lint-ignore no-explicit-any
            if (validationError instanceof Error && Array.isArray((validationError as any).errors)) {
                // deno-lint-ignore no-explicit-any
                const errors: PathError[] = (validationError as any).errors;
                throw new SDK.InvalidFieldValue(errors.map((pe) => ({
                    fieldPath: pe.path.join("."),
                    message: pe.error.message,
                })));
            }
            log.error(
                `validateRequestBody got an unexpected error type - expected a ValidationError, got: ${validationError}`,
            );
            throw validationError;
        }
    }

    /**
     * Get the siteId from the siteKey parameter that's in the URL.
     *
     * Most of our REST API methods include a human-readable "key" for the Site in the URL, like this:
     * https://api.neolace.com/site/braden/entry/fr-joel
     *                              ^^^^^^ - key is "braden"
     * This helper function looks up the Site based on this key and returns the siteId (VNID).
     *
     * This method will throw an exception if the site key is not in the URL or is not valid.
     *
     * @param request The current REST API request
     * @returns
     */
    protected async getSiteDetails(request: NeolaceHttpRequest): Promise<{ siteId: VNID }> {
        const siteKey = request.pathParam("siteKey");
        if (typeof siteKey !== "string") {
            throw new Error("Expected the API endpoint URL to contain a siteKey parameter.");
        }
        try {
            const siteId = await siteIdFromKey(siteKey);
            return { siteId };
        } catch (err) {
            if (err instanceof EmptyResultError) {
                throw new SDK.NotFound(`Site with short ID ${siteKey} not found.`);
            } else {
                throw err;
            }
        }
    }

    protected requireUser(request: NeolaceHttpRequest): AuthenticatedUserData {
        const user = request.user;
        if (user === undefined) {
            throw new SDK.NotAuthenticated();
        }
        return user;
    }

    protected async requirePermission(
        request: NeolaceHttpRequest,
        verb: SDK.PermissionName | SDK.PermissionName[],
        object?: ActionObject,
    ): Promise<void> {
        const checksPassed = await this.hasPermission(request, verb, object);

        if (!checksPassed) {
            if (request.user?.id === undefined) {
                // We don't know who this user is, so we don't know if they have permission or not.
                throw new SDK.NotAuthenticated();
            } else {
                // We know who this user is, and they're not allowed to do that.
                throw new SDK.NotAuthorized("You do not have sufficient permissions.");
            }
        }
    }

    protected async getPermissionSubject(request: NeolaceHttpRequest): Promise<ActionSubject> {
        const siteId = request.pathParam("siteKey")
            ? (await this.getSiteDetails(request)).siteId
            : (await getHomeSite()).siteId;
        const userId = request.user?.id ?? undefined;
        return { userId, siteId };
    }

    protected async hasPermission(
        request: NeolaceHttpRequest,
        verb: SDK.PermissionName | SDK.PermissionName[],
        object?: ActionObject,
    ): Promise<boolean> {
        if (request.user?.id === SYSTEM_VNID) {
            return true; // The system user is allowed to do anything using the API (dangerous)
        }
        const subject = await this.getPermissionSubject(request);
        return hasPermission(subject, verb, object ?? {});
    }

    /**
     * Parse the ?include=flag1,flag2,flag3 query parameter and return the set of included fields.
     * @param flagsEnum a string enum which contains all the valid fields (flags) that can be enabled.
     * @returns
     */
    protected getRequestFlags<T extends string>(request: NeolaceHttpRequest, flagsEnum: { [K: string]: T }): Set<T> {
        const include = request.queryParam("include");
        if (include === undefined) {
            return new Set();
        }
        const enabledFlags = new Set<T>();
        for (const includedFlag of include.split(",")) {
            // deno-lint-ignore no-explicit-any
            if (Object.values(flagsEnum).includes(includedFlag as any)) {
                // deno-lint-ignore no-explicit-any
                enabledFlags.add(includedFlag as any);
            }
        }
        return enabledFlags;
    }
}

interface ConvertErrorPathToField {
    // deno-lint-ignore no-explicit-any
    (path: string, obj: any): string | undefined;
}

/**
 * If 'err' is a computed_types ValidationError, return its PathError array, with detailed error messages.
 */
function getPathErrorsIfPresent(err: unknown): PathError[] | undefined {
    // deno-lint-ignore no-explicit-any
    if (err instanceof Error && (err as any).errors && (err as any).errors.length > 1) {
        // deno-lint-ignore no-explicit-any
        const errors: any[] = (err as any).errors;
        const result = errors.filter((e) => e.path && Array.isArray(e.path) && e.error instanceof Error);
        if (result) {
            // deno-lint-ignore no-explicit-any
            return result as any;
        }
    }
    return undefined;
}

/**
 * Use this in a .catch() block after runAction() to catch any exceptions that may arise from trying to run
 * an action on the graph database, and convert those exceptions to REST API errors.
 */
export function adaptErrors(...mapping: (string | ConvertErrorPathToField)[]) {
    // After an action is run on the graph database, but before it is committed, vertex framework will
    // validate all the fields of any changed models. If one of those fields is now invalid, we need to
    // map that error back to one of the request fields, if applicable.
    return function (err: unknown) {
        if (
            err instanceof Error && err.cause instanceof Error &&
            // TODO: change vertex to throw a specific error class so we don't have to match on error message strings:
            (err.message.includes("action failed during transaction validation") ||
                err.message.includes("action failed during apply() method"))
        ) {
            err = err.cause;
        }
        if (!(err instanceof Error)) {
            throw err;
        }

        convertStandardErrors(err);

        // Look for errors from our computed_types validators:
        let pathErrors = getPathErrorsIfPresent(err);
        // as well as other generic errors from Vertex Framework's field validation
        if (!pathErrors && err instanceof FieldValidationError) {
            // convert this error from Vertex Framework's FieldValidationError to PathErrors:
            pathErrors = [{ path: [err.field], error: new Error(err.innerMessage) }];
        }

        if (pathErrors) {
            const fieldErrors: { fieldPath: string; message: string }[] = [];
            // Remap these errors from database model field names to request fields,
            // and convert from the computed_types "PathError" format to out string-based format.
            pathErrors.forEach((pathError) => {
                const fieldPath = pathError.path.join(".");
                let found = false;
                if (mapping.includes(fieldPath)) {
                    // The (POST) request contained a field that has exactly the same name as this model field; easy.
                    fieldErrors.push({ fieldPath, message: pathError.error.message });
                    found = true;
                } else {
                    // If any of the values in "mapping" is a function mf(path, origObject) that returns a string
                    // telling us the request field responsible for this error, we use that:
                    for (const mf of mapping) {
                        if (typeof mf === "function") {
                            const requestField = mf(fieldPath, pathError.error);
                            if (requestField) {
                                fieldErrors.push({ fieldPath: requestField, message: pathError.error.message });
                                found = true;
                                break;
                            }
                        }
                    }
                }
                if (!found) {
                    // We can't map this field into the request, so we have to raise a generic "Internal Server Error"
                    // instead of a "bad request fields" error.
                    log.warning(
                        `adaptErrors: Cannot map ValidationError back to request fields - unknown field has path "${fieldPath}" in error "${err}" (${
                            JSON.stringify(err)
                        })`,
                    );
                    throw err;
                }
            });
            throw new SDK.InvalidFieldValue(fieldErrors);
        }

        // We don't know what this error is - it will result in an "Internal Server Error"
        log.warning(
            `Error of type ${err.name} cannot be converted to InvalidRequest by adaptErrors() - will result in Internal Server Error.`,
        );
        throw err;
    };
}
/**
 * Simple helper function for adaptErrors.
 *
 * Example:
 *     .catch(adaptErrors(..., adaptErrors.remap("internalField", "externalField")))
 * The above example means that any errors in validating the "internalField" field should be remapped to the
 * "externalField" field, and the API consumer will see a message that the "externalField" field was invalid.
 */
adaptErrors.remap = (errorPath: string, requestPath: string) => (field: string) =>
    field === errorPath ? requestPath : undefined;

function convertStandardErrors(err: Error): void {
    if (err.name === "Neo4jError") {
        if (err.message.match(/Node(.*) already exists with label `Human` and property `email`/)) {
            throw new SDK.InvalidRequest(
                SDK.InvalidRequestReason.EmailAlreadyRegistered,
                "A user account is already registered with that email address.",
            );
        }
    } else if (err.message.match(/The username ".*" is already taken./)) {
        throw new SDK.InvalidRequest(SDK.InvalidRequestReason.UsernameAlreadyRegistered, err.message);
    }
}

export { Drash, getGraph, log, SDK };
