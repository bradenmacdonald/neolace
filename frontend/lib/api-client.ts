import * as KeratinAuthN from "lib/keratin-authn/keratin-authn.min";
import useSWR, { KeyedMutator } from 'swr';
import { AsyncCache } from './async-cache';
import { useRouter } from 'next/router';
import { EvaluateLookupData, isVNID, NeolaceApiClient, NotFound, SiteDetailsData, VNID } from 'neolace-api';

import { API_SERVER_URL, IN_BROWSER } from 'lib/config';
import { ApiError } from 'next/dist/server/api-utils';

import * as api from 'neolace-api';
export * as api from 'neolace-api';

/** Use this in URLs in lieu of an ID if there is no ID yet. It's neither a valid VNID nor friendlyId. */
export const NEW = "_";
export type NEW = typeof NEW;

export type SiteData = SiteDetailsData;

/** Refresh the session token if needed */
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            url: "",
            footerMD: "━━━━━━━━━━━━━━",
            shortId: "",
            frontendConfig: {},
            isHomeSite: false,
            homeSiteName: "━━━━━━━━━━━━━━",
            homeSiteUrl: "",
        },
        refreshInterval: 10 * 60_000,  // Reload the site data every 10 minutes in case anything was changed.
    });
    if (data === undefined) { throw "fallbackError"; }  // Tell TypeScript data is always defined due to the fallback above.
    return {site: data, siteError: error};
}


/**
 * React hook to evaluate a lookup expression
 * @returns 
 */
export function useLookupExpression(expr: string, options: {entryId?: VNID} = {}): {result: EvaluateLookupData|undefined, error: ApiError} {
    const {site} = useSiteData();
    // TODO: include an entry revision number in this ID
    const key = `lookup:${site.shortId}:${options.entryId ?? 'none'}:no-draft:${expr}`;
    const { data, error } = useSWR(key, async () => {
        if (expr.trim() === "") {
            // If there is no expression, don't bother hitting the API:
            return {
                resultValue: {type: "Null" as const},
                entryContext: options.entryId,
                referenceCache: { entries: {}, entryTypes: {}, lookups: [], properties: {} },
            };
        } else if (site.shortId) {
            return await client.evaluateLookupExpression(expr, {entryKey: options.entryId, siteId: site.shortId});
        } else {
            return undefined;
        }
    }, {

        // refreshInterval: 10 * 60_000,
    });
    return {result: data, error};
}

/**
 * React hook to get the current site's schema
 * @returns 
 */
export function useSiteSchema(): [data: api.SiteSchemaData|undefined, error: ApiError|undefined] {
    const {site, siteError} = useSiteData();

    const key = `siteSchema:${site.shortId}:no-draft`;
    const { data, error } = useSWR(key, async () => {
        if (siteError) {
            throw new ApiError(500, "Site Error");
        }
        if (!site.shortId) {
            return undefined; // We need to wait for the siteId before we can load the entry
        }
        return await client.getSiteSchema({siteId: site.shortId});
    }, {

        // refreshInterval: 10 * 60_000,
    });
    return [data, error];
}

type DraftDataWithEdits = Required<api.DraftData>;

/**
 * React hook to get the currently published version of an entry, to use as a basis for making edits.
 * @returns 
 */
export function useDraft(draftId: VNID|"_"): [data: DraftDataWithEdits|undefined, error: ApiError|undefined, mutate: KeyedMutator<DraftDataWithEdits|undefined>] {
    const {site, siteError} = useSiteData();

    const key = `draft:${site.shortId}:${draftId}`;
    const { data, error, mutate } = useSWR(key, async (): Promise<DraftDataWithEdits|undefined> => {
        if (siteError) {
            throw new ApiError(500, "Site Error");
        }
        if (draftId === NEW) {
            return undefined;
        }
        if (!isVNID(draftId)) {
            throw new ApiError(500, "Not a valid VNID");
        }
        if (!site.shortId) {
            return undefined; // We need to wait for the siteId before we can load the draft
        }
        try {
            const data = await client.getDraft(draftId, {flags: [
                api.GetDraftFlags.IncludeEdits,
            ] as const, siteId: site.shortId});
            return data;
        } catch (err) {
            throw err;
        }
    }, {
        // refreshInterval: 10 * 60_000,
    });
    return [data, error, mutate];
}


/**
 * React hook to get the currently published version of an entry, to use as a basis for making edits.
 * @returns 
 */
export function useEditableEntry(entryId: VNID | {newEntryWithId: VNID}): [data: api.EditableEntryData|undefined, error: ApiError|undefined, mutate: KeyedMutator<api.EditableEntryData|undefined>] {
    const {site, siteError} = useSiteData();

    // TODO: Change "no-draft" below to the ID of the current draft, if any, from a <DraftContext> provider.
    const key = `entry:${site.shortId}:no-draft:${entryId}`;
    const { data, error, mutate } = useSWR(key, async () => {
        if (siteError) {
            throw new ApiError(500, "Site Error");
        }
        if (typeof entryId === "object") {
            if (isVNID(entryId.newEntryWithId)) {
                // We are creating a new entry, and it has been assigned a temporary new VNID:
                const blankEntry: api.EditableEntryData = {
                    id: entryId.newEntryWithId,
                    friendlyId: "",
                    name: "",
                    description: "",
                    entryType: {id: "" as VNID, name: ""},
                    features: {},
                    propertiesRaw: [],
                };
                return blankEntry;
            } else {
                throw new ApiError(500, "Not a valid entry ID.");
            }
        }
        if (!site.shortId) {
            return undefined; // We need to wait for the siteId before we can load the entry
        }
        if (!isVNID(entryId)) {
            throw new ApiError(500, `"${entryId}" is not a valid VNID`);
        }
        const data: api.EditableEntryData = await client.getEntry(entryId, {flags: [
            api.GetEntryFlags.IncludeFeatures,
            api.GetEntryFlags.IncludeRawProperties,
        ] as const, siteId: site.shortId});
        return data;
    }, {

        // refreshInterval: 10 * 60_000,
    });
    return [data, error, mutate];
}
