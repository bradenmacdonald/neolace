import "lib/keratin-authn/keratin-authn.min";
import React from "react";
import useSWR, { KeyedMutator } from "swr";
import { AsyncCache } from "./async-cache";
import { useRouter } from "next/router";
import { EvaluateLookupData, NeolaceApiClient, NotFound, SiteDetailsData, VNID } from "neolace-api";

import { API_SERVER_URL, IN_BROWSER } from "lib/config";
import { ApiError } from "next/dist/server/api-utils";

import * as api from "neolace-api";
import { getSessionToken, useUser } from "./authentication";
export * as api from "neolace-api";

/** Use this in URLs in lieu of an ID if there is no ID yet. It's neither a valid VNID nor friendlyId. */
export const NEW = "_";
export type NEW = typeof NEW;

export type SiteData = SiteDetailsData;

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

export const client = new NeolaceApiClient({
    basePath: API_SERVER_URL,
    fetchApi: globalThis.fetch.bind(globalThis),
    getExtraHeadersForRequest,
});

const siteDataCache = new AsyncCache<string, SiteDetailsData>(
    async (domain) => {
        return await client.getSite({ domain });
    },
    5 * 60_000, // timeout is 5 minutes
);

/** Server-side method to get data about a site by domain. On the client side, use the useSiteData() hook. */
export async function getSiteData(domain: string): Promise<SiteDetailsData | null> {
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
export function useSiteData(options: { fallback?: SiteData } = {}): { site: SiteData; siteError: ApiError } {
    const router = useRouter();
    // router.query.siteHost gives the site's domain name because of how we have the Next.js URL rewriting configured.
    const domain = router.query.siteHost as string;
    // eslint-disable-next-line prefer-const
    let { data, error } = useSWR(`site:${domain}`, async () => {
        if (domain) {
            return await client.getSite({ domain });
        } else {
            throw new Error("Can't load site yet because domain is unknown.");
        }
    }, {
        refreshInterval: 10 * 60_000, // Reload the site data every 10 minutes in case anything was changed.
    });
    if (data === undefined) {
        // If data is undefined at this point, it means that it hasn't yet been loaded from the API (or couldn't be),
        // AND that the data is not available from a parent <SiteDataProvider> (which usually should be the source of
        // preloaded site data for most pages in Neolace.)
        // Fallback to a default while we wait for the data to load:
        // Note that we cannot use this as a 'fallbackData' parameter in the useSWR call above, because then it would
        // overwrite the data coming from <SiteDataProvider>, which makes the preloaded site data available as a
        // global fallback.
        data = options.fallback ?? {
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
        };
    }
    return { site: data, siteError: error };
}

/**
 * React hook to evaluate a lookup expression
 * @returns
 */
export function useLookupExpression(
    expr: string,
    options: { entryId?: VNID; pageSize?: number } = {},
): { result: EvaluateLookupData | undefined; error: ApiError } {
    const { site } = useSiteData();
    // TODO: include an entry revision number in this ID
    const key = `lookup:${site.shortId}:${options.entryId ?? "none"}:${options.pageSize ?? "default"}:no-draft:${expr}`;
    const { data, error } = useSWR(key, async () => {
        if (expr.trim() === "") {
            // If there is no expression, don't bother hitting the API:
            return {
                resultValue: { type: "Null" as const },
                entryContext: options.entryId,
                referenceCache: { entries: {}, entryTypes: {}, lookups: [], properties: {} },
            };
        } else if (site.shortId) {
            return await client.evaluateLookupExpression(expr, {
                entryKey: options.entryId,
                siteId: site.shortId,
                pageSize: options.pageSize,
            });
        } else {
            return undefined;
        }
    }, {
        // refreshInterval: 10 * 60_000,
    });
    return { result: data, error };
}

/**
 * React hook to get the data required to display an entry
 */
export function useEntry(
    entryKey: VNID | string,
    fallback?: api.EntryData,
): [data: api.EntryData | undefined, error: ApiError | undefined] {
    const { site, siteError } = useSiteData();
    const user = useUser();
    const userKey = user.username ?? "";

    const key = `entry:${site.shortId}:${entryKey}:${userKey}:no-draft`;
    const { data, error } = useSWR(key, async () => {
        if (siteError) {
            throw new ApiError(500, "Site Error");
        }
        if (!site.shortId) {
            return undefined; // We need to wait for the siteId before we can load the entry
        }
        const data: api.EntryData = await client.getEntry(entryKey, {
            flags: [
                api.GetEntryFlags.IncludeFeatures,
                api.GetEntryFlags.IncludePropertiesSummary,
                api.GetEntryFlags.IncludeReferenceCache,
            ] as const,
            siteId: site.shortId,
        });
        return data;
    }, {
        // refreshInterval: 10 * 60_000,
    });
    if (!data && !error && fallback) {
        // Use the public version of the entry until we've loaded the user-specific version.
        return [fallback, undefined];
    }
    return [data, error];
}

/**
 * In this context, a "reference cache" is available to provide data on any Entry, Entry Type, or Property that is
 * referenced. For example, in the context of an Entry A that links to Entry B, the reference cache will include some
 * details about Entry B such as its Name and friendly ID, so that the link to it can be properly displayed within Entry
 * A.
 */
 export const RefCacheContext = React.createContext<{refCache?: api.ReferenceCacheData, parentRefCache?: api.ReferenceCacheData}>({
    // Default values for this context:
    refCache: undefined,
});

/**
 * In this context, there is a "current entry ID". e.g. on an entry page, this is the ID of the entry being viewed.
 */
export const EntryContext = React.createContext<{entryId: VNID|undefined}>({
    // Default values for this context:
    entryId: undefined,
});

export interface DraftContextData {
    draftId: VNID|'_'|undefined;
    unsavedEdits: ReadonlyArray<api.AnyEdit>;
}
/**
 * In this context, there is a "current draft ID". e.g. when editing a draft
 */
export const DraftContext = React.createContext<DraftContextData>({
    // Default values for this context:
    draftId: undefined,
    /**
     * Edits that have been made in the UI in the browser but not yet saved into the draft (they'll be lost if the
     * browser window is closed).
     */
    unsavedEdits: [],
});


type DraftDataWithEdits = Required<api.DraftData>;

/**
 * React hook to get a draft
 * @returns
 */
export function useDraft(
    context: {draftContext?: DraftContextData} = {},
): [
    data: DraftDataWithEdits | undefined,
    unsavedEdits: ReadonlyArray<api.AnyEdit>,
    error: api.ApiError | undefined,
    mutate: KeyedMutator<DraftDataWithEdits | undefined>,
] {
    const { site, siteError } = useSiteData();
    const _autoDraftContext = React.useContext(DraftContext);
    const draftContext = context.draftContext || _autoDraftContext;
    const draftId = draftContext.draftId;

    const key = `draft:${site.shortId}:${draftId}`;
    const { data, error, mutate } = useSWR(key, async (): Promise<DraftDataWithEdits | undefined> => {
        if (siteError) {
            throw new api.ApiError("Site Error", 500);
        }
        if (draftId === "_" || draftId === undefined) {
            return undefined;
        }
        if (!api.isVNID(draftId)) {
            throw new api.ApiError("Not a valid VNID", 500);
        }
        if (!site.shortId) {
            return undefined; // We need to wait for the siteId before we can load the draft
        }
        return await client.getDraft(draftId, {flags: [
            api.GetDraftFlags.IncludeEdits,
        ] as const, siteId: site.shortId});
    }, {
        // refreshInterval: 10 * 60_000,
    });

    return [data, draftContext.unsavedEdits, error, mutate];
}


/**
 * React hook to get the current site's schema, including any edits made within the current draft.
 * @returns
 */
export function useSchema(
    context: {draftContext?: DraftContextData} = {},
): [data: api.SiteSchemaData | undefined, error: api.ApiError | undefined] {
    const { site, siteError } = useSiteData();
    const [draft, unsavedEdits] = useDraft(context);

    const key = `siteSchema:${site.shortId}`;
    const { data: baseSchema, error } = useSWR(key, async () => {
        if (siteError) {
            throw new api.ApiError("Site Error", 500);
        }
        if (!site.shortId) {
            return undefined; // We need to wait for the siteId before we can load the entry
        }
        return await client.getSiteSchema({ siteId: site.shortId });
    }, {
        // refreshInterval: 10 * 60_000,
    });

    // Apply any edits from the draft, if present:
    const schema = React.useMemo(() => {
        if (baseSchema === undefined) {
            // Base schema hasn't loaded yet.
        } else if (draft?.edits || unsavedEdits.length > 0) {
            const edits = [...(draft?.edits ?? []), ...unsavedEdits];
            const schema = api.applyEditsToSchema(baseSchema, edits);
            return schema;
        } else {
            return baseSchema;
        }
    }, [baseSchema, draft?.edits, unsavedEdits]);

    return [schema, error];
}

/**
 * React hook to get an editable version of the entry (including all editable properties, not just the "top" properties
 * seen in the property summary).
 * This is aware of the DraftContext and will apply any edits and unsaved edits from the draft, if present.
 */
export function useEditableEntry(
    /** The ID of the entry. May be a new entry if the draft context contains a 'CreateEntry' edit. */
    entryId: VNID,
    /** Is this a new entry? If so we won't try to load the "base version" from the server. */
    isNewEntry: boolean,
    context: {draftContext?: DraftContextData},
): [
    data: api.EditableEntryData | undefined,
    error: api.ApiError | undefined,
    // mutate: KeyedMutator<api.EditableEntryData | undefined>,
] {
    const { site, siteError } = useSiteData();
    // Get the site schema. We don't need the draft's edits to be applied to it.
    const [baseSchema] = useSchema();

    // Get the draft, if set.
    const [draft, unsavedEdits, draftError] = useDraft(context);

    // Get the "base version" of the entry (currently published version), if it exists.
    const key = `entry-edit:${site.shortId}:${entryId}`;
    const { data: baseEntry, error } = useSWR(key, async () => {
        if (siteError) {
            throw new api.ApiError("Site Error", 500);
        }
        if (!api.isVNID(entryId)) {
            throw new api.ApiError(`"${entryId}" is not a valid VNID`, 500);
        }
        if (!site.shortId) {
            return undefined; // We need to wait for the siteId before we can load the entry
        }
        let data: api.EditableEntryData = {
            // Start with blank entry data:
            id: entryId,
            friendlyId: "",
            name: "",
            description: "",
            entryType: { id: "" as VNID, name: "" },
            features: {},
            propertiesRaw: [],
        };
        if (!isNewEntry) {
            try {
                data = await client.getEntry(entryId, {
                    flags: [
                        api.GetEntryFlags.IncludeFeatures,
                        api.GetEntryFlags.IncludeRawProperties,
                    ] as const,
                    siteId: site.shortId,
                });
            } catch (err) {
                if (err instanceof api.NotFound) {
                    // No such entry exists. But it may exist within the draft, if it was previously created and saved
                    // to this draft. So for now we just return a blank entry. We can't check if it exists within the
                    // draft here because this useSWR fetcher is not keyed to the draft's edits so shouldn't use them.
                } else { throw err; }
            }
        } else {
            // This is a newly-created entry. We won't be able to retrieve it from the API since it hasn't actually been created yet.
            // Just return the blank entry data already created.
        }
        return data;
    }, {
        // refreshInterval: 10 * 60_000,
    });

    // Combine the base entry (if set) with any edits from the draft
    const entry = React.useMemo(() => {
        // What the user is currently editing and should see on the screen is:
        // The previously published version of the entry (if any),
        // PLUS any edits previously made to it in the current draft (if any),
        // PLUS any edits currently made on this page now, but not yet saved to the draft (if any)
        const edits: api.AnyEdit[] = [...(draft?.edits ?? []), ...unsavedEdits];
        return baseEntry && baseSchema
            ? api.applyEditsToEntry(baseEntry, baseSchema, edits)
            : undefined;
    }, [baseEntry, baseSchema, draft?.edits, unsavedEdits]);

    return [entry, error];
}



/**
 * React hook to get the user's permissions in a certain context.
 */
 export function usePermissions(context?: {
    /** The ID of the entry, if we want to know entry-specific information */
    entryId?: VNID,
    draftContext?: DraftContextData,
 }): api.SiteUserMyPermissionsData | undefined {
    const user = useUser();
    const { site, siteError } = useSiteData();

    // Get the draft, if set.
    const [draft, unsavedEdits, _draftError] = useDraft(context);

    // Get the user's permissions, in the given context:
    const key = `user-permissions:${user.username}:${context?.entryId ?? ""}:${draft?.id ?? ""}`;
    const { data, error } = useSWR(key, async () => {
        if (siteError) {
            throw new api.ApiError("Site Error", 500);
        }
        if (!site.shortId) {
            return undefined; // We need to wait for the siteId before we can load the entry
        }
        return client.getMyPermissions({entryId: context?.entryId, draftId: draft?.id, siteId: site.shortId});
    }, {
        // refreshInterval: 10 * 60_000,
    });

    if (error) {
        console.error(error);
    }
    return data;
}

// TODO: a useRefCache() hook that uses the RefCacheContext plus applies any edits from the draft to the reference
// cache.
