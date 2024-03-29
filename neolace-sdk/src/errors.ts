import type { AnyBulkEdit } from "./edit/BulkEdit.ts";
import type { AnyContentEdit } from "./edit/ContentEdit.ts";
import type { AnySchemaEdit } from "./schema/SchemaEdit.ts";

/** Base class for any error that can occur when using the Neolace API */
export class ApiError extends Error {
    readonly statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.name = "ApiError";
        this.statusCode = statusCode;
    }
}

/**
 * The underlying fetch request failed, likely due to a network problem.
 */
export class ConnectionError extends ApiError {
    constructor(message: string) {
        super(message, 0);
        this.name = "ConnectionError";
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
 * One or more of the things you requested could not be found.
 */
export class NotFound extends ApiError {
    constructor(message: string) {
        super(message, 404);
        this.name = "NotFound";
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
    readonly fieldErrors: { fieldPath: string; message: string }[];
    constructor(fieldErrors: { fieldPath: string; message: string }[]) {
        const message = fieldErrors.map((fe) => `${fe.fieldPath}: ${fe.message}`).join(", ");
        super(InvalidRequestReason.InvalidFieldValue, message);
        this.fieldErrors = fieldErrors;
        this.name = "InvalidFieldValue";
    }
}

/**
 * An edit that you tried to apply to an entry/entries or to the schema was invalid or could not be applied.
 */
export class InvalidEdit extends InvalidRequest {
    constructor(
        // The code string identifying the edit that failed:
        public readonly editCode: AnySchemaEdit["code"] | AnyContentEdit["code"] | AnyBulkEdit["code"],
        /**
         * entryId or any other information useful to locating which edit failed. Most error details should be in this
         * data field, NOT in the message, in order to make the errors more machine readable and translatable into
         * other languages.
         */
        public readonly context: Record<string, unknown>,
        public readonly message: string,
    ) {
        super(InvalidRequestReason.InvalidEdit, message);
        this.name = "InvalidEdit";
    }
}

// This is a const enum so that it has minimal overhead
export enum InvalidRequestReason {
    /** One or more of the fields you provided is invalid, e.g. blank, too short, too long, invalid character, etc. */
    InvalidFieldValue = "400_INVALID_FIELD",
    /** An edit that you tried to apply to an entry/entries or to the schema was invalid or could not be applied. */
    InvalidEdit = "400_INVALID_EDIT",
    /** The provided lookup expression could not be parsed */
    LookupExpressionParseError = "400_LOOKUP_PARSE_ERROR",
    /** Tried to register a user account, but another account already exists with the same email */
    EmailAlreadyRegistered = "400_EMAIL_EXISTS",
    /** The email validation link/token is either expired or invalid. Try again. */
    ValidationTokenInvalid = "400_VAL_TOKEN_INVALID",
    /** Tried to register a user account, but another account already exists with the same username */
    UsernameAlreadyRegistered = "400_USERNAME_EXISTS",
    /** Cannot create a new site because it already exists */
    SiteAlreadyExists = "400_SITE_EXISTS",
    /** Tried to accept a draft that contains no edits */
    DraftIsEmpty = "400_DRAFT_EMPTY",
    /** The server returned a 400 bad request code without a 'reason' that this API client understands. */
    OtherReason = "400",
}
