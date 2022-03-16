import * as KeratinAuthN from 'keratin-authn';
import useSWR from 'swr';
import { AsyncCache } from './async-cache';
import { useRouter } from 'next/router';
import { NeolaceApiClient, NotFound, SiteDetailsData } from 'neolace-api';

import { API_SERVER_URL, IN_BROWSER } from 'lib/config';
import { ApiError } from 'next/dist/server/api-utils';

export * as api from 'neolace-api';

export type SiteData = SiteDetailsData;

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
 * Helper that defines how to make authenticated API calls to the Neolace API
 */
async function getExtraHeadersForRequest(): Promise<Record<string, string>> {
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

export const client = new NeolaceApiClient({
    basePath: API_SERVER_URL,
    fetchApi: globalThis.fetch.bind(globalThis),
    getExtraHeadersForRequest,
});

const siteDataCache = new AsyncCache<string, SiteDetailsData>(
    async (domain) => {
        return await client.getSite({domain,});
    },
    5 * 60_000,  // timeout is 5 minutes
);

export async function getSiteData(domain: string): Promise<SiteDetailsData|null> {
    try {
        // If the site has been previously retrieved, this cache will always return the cached value immediately.
        // (Occasionally it will be refreshed in the background, but we still get an immediate result here.)
        return await siteDataCache.get(domain);
    } catch (err) {
        if (err instanceof NotFound) {
            return null;
        }
        throw err;
    }
}

// Store the API client on the global window object for development purposes.
if (IN_BROWSER) {
    // deno-lint-ignore no-explicit-any
    (window as any).client = client;
}

/**
 * React hook to get basic data about the current site.
 * @returns 
 */
export function useSiteData(options: {fallback?: SiteData} = {}): {site: SiteData, siteError: ApiError} {
    const router = useRouter();
    // router.query.siteHost gives the site's domain name because of how we have the Next.js URL rewriting configured.
    const domain = router.query.siteHost as string;
    const { data, error } = useSWR(`site:${domain}`, async () => {
        if (domain) {
            return await client.getSite({domain});
        } else {
            throw new Error("Can't load site yet because domain is unknown.");
        }
    }, {
        fallbackData: (options.fallback && options.fallback.domain === domain) ? options.fallback : {
            name: "━━━━━━━━━━━━━━",
            description: "",
            domain,
            footerMD: "━━━━━━━━━━━━━━",
            shortId: "",
            frontendConfig: {},
        },
        refreshInterval: 10 * 60_000,  // Reload the site data every 10 minutes in case anything was changed.
    });
    if (data === undefined) { throw "fallbackError"; }  // Tell TypeScript data is always defined due to the fallback above.
    return {site: data, siteError: error};
}
