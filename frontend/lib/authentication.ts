import * as KeratinAuthN from "lib/keratin-authn/keratin-authn.min";

import { IN_BROWSER } from "./config";

/** Refresh the session token if needed, then return it */
const getSessionPromise = () => {
    if (IN_BROWSER && KeratinAuthN.session()) {
        // There is a session token saved locally, but we don't know if it's still valid.
        return KeratinAuthN.restoreSession().catch(() => {
            console.error("Session token was invalid, or an error occurred while refreshing it.");
            // If we're unable to restore/validate the sesion,
            // clear the session cookie so we don't try to log in again.
            KeratinAuthN.logout();
        });
    }
    // There is no session saved locally, or we're running on the server; either way, no user is logged in.
    return Promise.resolve();
};
const apiSessionPromise: Promise<void> = getSessionPromise();

/**
 * Get the session token, to make API calls. If possible, use getSessionToken() instead.
 */
// export function getUnvalidatedSessionToken(): string|undefined {
//     return KeratinAuthN.session();
// }

/**
 * Get the session token, used to make authenticated API requests.
 */
export async function getSessionToken(): Promise<string | undefined> {
    await apiSessionPromise;
    return KeratinAuthN.session();
}
