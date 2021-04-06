/** Base class for any error that can occur when using the Neolace API */
export class ApiError extends Error {
    readonly statusCode: number|undefined;

    constructor(message: string, statusCode?: number) {
        super(message);
        this.name = "ApiError";
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
        this.name = "NotAuthenticated";
    }
}

/**
 * Neolace knows who you are, but don't have permission to do what you were trying to do.
 */
export class NotAuthorized extends ApiError {
    constructor(message: string) {
        super(message, 403);
        this.name = "NotAuthorized";
    }
}

/**
 * Neolace cannot complete the request, because some of the data you specified
 * is invalid or inconsistent.
 */
export class InvalidRequest extends ApiError {

    readonly reason: InvalidRequestReason;

    constructor(reason: InvalidRequestReason, message: string) {
        super(message, 400);
        this.reason = reason;
        this.name = "InvalidRequest";
    }
}

/**
 * One or more of the fields you provided is invalid, e.g. blank, too short, too long, invalid character, etc.
 */
export class InvalidFieldValue extends InvalidRequest {
    readonly fields: string[];
    constructor(fields: string[], message: string) {
        super(InvalidRequestReason.Invalid_field_value, message);
        this.fields = fields;
        this.name = "InvalidFieldValue";
    }
}

// This is a const enum so that it has minimal overhead
export const enum InvalidRequestReason {
    /** One or more of the fields you provided is invalid, e.g. blank, too short, too long, invalid character, etc. */
    Invalid_field_value = "400_INVALID_FIELD",
    /** Tried to register an email account, but another account already exists with the same email */
    Email_already_registered = "400_EMAIL_EXISTS",
    /** Tried to register an email account, but another account already exists with the same username */
    Username_already_registered = "400_EMAIL_EXISTS",
}
