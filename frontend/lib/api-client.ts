import "lib/keratin-authn/keratin-authn.min";
import * as api from "neolace-api";

import { API_SERVER_URL, IN_BROWSER } from "lib/config";
import { getSessionToken } from "./authentication";

/**
 * Helper that defines how to make authenticated API calls to the Neolace API
 */
async function getExtraHeadersForRequest(): Promise<Record<string, string>> {
    if (IN_BROWSER) {
        // Validate the API token if needed, then add it to the request:
        const token = await getSessionToken();
        if (token) {
            // Add the "Authorization" header to every REST API request.
            return { Authorization: `Bearer ${token}` };
        }
    }
    return {};
}

export const client = new api.NeolaceApiClient({
    basePath: API_SERVER_URL,
    fetchApi: globalThis.fetch.bind(globalThis),
    getExtraHeadersForRequest,
});

// Store the API client on the global window object for development purposes.
if (IN_BROWSER) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).client = client;
}
