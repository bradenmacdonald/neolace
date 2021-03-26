import * as KeratinAuthN from 'keratin-authn';
import { API_SERVER_URL, IN_BROWSER } from 'lib/config';
import { TechNotesApiClient } from 'technotes-api';

/** Refresh the session token if needed */
const getSessionPromise = () => {
    if (IN_BROWSER && KeratinAuthN.session()) {
        // There is a session token saved locally, but we don't know if it's still valid.
        return KeratinAuthN.restoreSession().catch(() => {
            console.error("Session token was invalid, or an error occurred while refreshing it.");
            // If we're unable to restore/validate the sesion,
            // clear the session cookie so we don't try to log in again.
            KeratinAuthN.logout().finally(() => {});
        });
    }
    // There is no session saved locally, or we're running on the server; either way, no user is logged in.
    return Promise.resolve();
}

/**
 * A promise that will be resolved when the session token is either validated or deleted.
 * Wait for this promise before checking/using KeratinAuthN.session()
 */
export const apiSessionPromise: Promise<void> = getSessionPromise();

/**
 * Helper that defines how to make authenticated API calls to the TechNotes API
 */
async function getExtraHeadersForRequest() {
    if (IN_BROWSER) {
        // Validate the API token if needed, then add it to the request:
        try {
            await apiSessionPromise;
        } catch { console.error(`apiSessionPromise rejected; shouldn't happen.`); }
        if (KeratinAuthN.session()) {
            // Add the "Authorization" header to every REST API request.
            return {
                Authorization: `Bearer ${KeratinAuthN.session()}`,
            };
        }
    }
    return {};
}

export const client = new TechNotesApiClient({
    basePath: API_SERVER_URL,
    fetchApi: IN_BROWSER ? window.fetch.bind(window) : require('node-fetch'),
    getExtraHeadersForRequest,
});