interface Credentials {
    [index: string]: string;
    username: string;
    password: string;
}
interface CookieSessionStoreOptions {
    path?: string;
    domain?: string;
    sameSite?: "Lax" | "Strict" | "None";
}
export declare function restoreSession(): Promise<void>;
export declare function importSession(): Promise<void>;
export declare function setCookieStore(sessionName: string, opts?: CookieSessionStoreOptions): void;
export declare function session(): string | undefined;
export declare function signup(credentials: Credentials): Promise<void>;
export declare function login(credentials: Credentials): Promise<void>;
export declare function logout(): Promise<void>;
export declare function changePassword(args: {
    password: string;
    currentPassword: string;
}): Promise<void>;
export declare function resetPassword(args: {
    password: string;
    token: string;
}): Promise<void>;
export declare function sessionTokenLogin(args: {
    token: string;
}): Promise<void>;

export declare function setHost(URL: string): void;
export declare function isAvailable(username: string): Promise<boolean>;
export declare function requestPasswordReset(username: string): Promise<void>;
export declare function requestSessionToken(username: string): Promise<void>;
