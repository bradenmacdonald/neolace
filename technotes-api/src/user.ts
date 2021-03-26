export interface UserData {
    username: string;
    realname: string|null;
    /** ISO 3166-1 two-letter country code */
    country: string;
}

export interface PasswordlessLoginResponse {
    /** Determines whether or not the user's passwordless login request succeeded */
    requested: boolean;
}
