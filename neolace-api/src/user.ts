import { Schema, string, boolean, normalString, object } from "./api-schemas.ts";

export interface PasswordlessLoginResponse {
    /** Determines whether or not the user's passwordless login request succeeded */
    requested: boolean;
}

export const UserDataResponse = Schema.either(
    {
        isBot: boolean.equals(false),
        username: normalString,
        fullName: normalString,
    },
    {
        isBot: boolean.equals(true),
        ownedByUsername: string,
        username: normalString,
        fullName: normalString,
    }
);

/**
 * Data required when requesting creation of a (normal, human) user account
 */
export const CreateHumanUser = Schema({
    emailToken: normalString,
    fullName: normalString.strictOptional(),
    username: normalString.strictOptional(),
});

export const CreateHumanUserResponse = Schema({
    temporaryCredentials: Schema({
        /** A temporary username just for logging in to our AuthN server this one time. */
        username: string,
        /** A password that can be used to log the user in after registration, and to set a new password. */
        password: string,
    }),
    userData: UserDataResponse,
});


/**
 * Before registering a user account, that user's email address must be verified using this API.
 * This request will cause the system to send an email to the specified user.
 */
export const VerifyEmailRequest = Schema({
    /** The user's email that we want to verify */
    email: normalString,
    /** Optional: which site the user wants to use. This will affect the branding of the email */
    siteFriendlyId: normalString.strictOptional(),
    /** 
     * The sent email should include a link that takes the user to this URL to continue with registration.
     * The link should include the string "{token}" which will be replaced with the email validation token
     * that proves the user got the email.
     */
    returnUrl: string,
    /**
     * Data which must be JSON-encodable and which can be retrieved later from the API using
     * the email validation token. Usually used to store the user's full name / username.
     */
    data: object,
});

/**
 * If you request verification of an email, a token gets email to that user.
 * If you use the API to check if that token is valid, this is the data you get back.
 */
export const EmailTokenResponse = Schema({
    email: normalString,
    // deno-lint-ignore no-explicit-any
    data: object.transform(x => x as Record<string, any>),
});
