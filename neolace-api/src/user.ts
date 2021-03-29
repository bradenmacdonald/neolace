export interface HumanUserData {
    isBot: false;
}

export interface BotUserData {
    isBot: true;
    ownedByUsername: string;  // The username of the user that owns this both
}

export type PublicUserData = {
    /** The user's username. Works as an ID but can be changed from time to time. A permanent identified is not provided for privacy reasons. */
    username: string;
    /** The user's full name if known. May be an empty string. */
    fullName: string;
} & (HumanUserData | BotUserData);

export interface PasswordlessLoginResponse {
    /** Determines whether or not the user's passwordless login request succeeded */
    requested: boolean;
}
