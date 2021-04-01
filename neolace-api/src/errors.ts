
/** Base class for any error that can occur when using the Neolace API */
export class ApiError extends Error {
    readonly statusCode: number|undefined;

    constructor(message: string, statusCode?: number) {
        super(message);
        this.name = "ValidationError";
        this.statusCode = statusCode;
    }
}

/**
 * Neolace doesn't know who you are.
 * 
 * Note that the HTTP status code for this is "401 Unauthorized", which
 * is confusing - the HTTP spec predates the modern usage convention.
 */
export class NotAuthenticated extends ApiError {
    constructor(message = "Not Authenticated. Log in or specify an authentication token and try again.") {
        super(message, 401);
    }
}

/**
 * Neolace knows who you are, but don't have permission to do what you were trying to do.
 */
export class NotAuthorized extends ApiError {
    constructor(message: string) {
        super(message, 403);
    }
}
