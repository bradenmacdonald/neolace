import * as api from "neolace-api";
import React from "react";
import useSWR from "swr";

import { client } from "lib/api-client";
import { useSiteData } from "./SiteData";
import { useUser } from "./User";
import { useRefCache } from "./ReferenceCache";
import { useDraft } from "./DraftData";

/**
 * React hook to get the data required to display an entry
 */
export function useEntry(
    entryKey: api.VNID | string,
    fallback?: api.EntryData,
): [data: api.EntryData | undefined, error: api.ApiError | undefined] {
    const { site, siteError } = useSiteData();
    const user = useUser();
    const userKey = user.username ?? "";

    const key = `entry:${site.key}:${entryKey}:${userKey}:no-draft`;
    const { data, error } = useSWR(key, async () => {
        if (siteError) {
            throw new api.ApiError("Site Error", 500);
        }
        if (!site.key) {
            return undefined; // We need to wait for the siteKey before we can load the entry
        }
        const data: api.EntryData = await client.getEntry(entryKey, {
            flags: [
                api.GetEntryFlags.IncludeFeatures,
                api.GetEntryFlags.IncludePropertiesSummary,
                api.GetEntryFlags.IncludeReferenceCache,
            ] as const,
            siteKey: site.key,
        });
        return data;
    }, {
        // refreshInterval: 10 * 60_000,
    });
    if (!data && fallback) {
        if (error) {
            // There was an error loading the (user-specific) version; fall back to the public version but report the error.
            console.error(error);
        }
        // Use the public version of the entry until we've loaded the user-specific version.
        return [fallback, undefined];
    } else if (data && error) {
        console.error(`Unable to refresh entry data:`, error);
        return [data, undefined];
    }
    return [data, error];
}

/**
 * React hook to get very basic data about an entry; e.g. its name and type.
 */
export function useEntrySummary(
    entryKey: api.VNID | string,
): [data: api.RefCacheEntryData | undefined, refCache: api.ReferenceCacheData, error: api.ApiError | undefined] {
    const { site } = useSiteData();
    const refCache = useRefCache();
    const [draft, unsavedEdits] = useDraft();
    const user = useUser();
    const userKey = user.username ?? "";

    // The logic here is very simple: if it's in 'refCache', return that data; otherwise, fetch a new refCache
    // from the server and return that.
    // However, actually implementing this logic is complicated because we cannot conditionally call React hooks.
    // So we have to move the 'if (useExistingRefCache) {...} else {...}' inside each of these hook calls below:

    const useExistingRefCache = refCache.entries[entryKey] !== undefined;

    const key = useExistingRefCache ? "" : `entry:${site.key}:${entryKey}:${userKey}:${draft?.num ?? "no-draft"}`;
    const { data, error } = useSWR(key, async () => {
        if (key === "") {
            return undefined; // This data is in the reference cache; no need to load anything from the server.
        }
        if (!site.key) {
            return undefined; // We need to wait for the siteKey before we can load the entry
        }
        return await client.evaluateLookupExpression(`entry("${entryKey}")`, { siteKey: site.key });
    }, {
        // refreshInterval: 10 * 60_000,
    });

    const returnedRefCache = React.useMemo(() => {
        if (useExistingRefCache) {
            return refCache;  // Edits from the draft are already applied to this reference cache
        } else {
            const baseRefCache = data?.referenceCache ?? {entries: {}, entryTypes: {}, lookups: [], properties: {}};
            let newRefCache = baseRefCache;
            if (draft?.edits || unsavedEdits.length > 0) {
                newRefCache = api.applyEditsToReferenceCache(baseRefCache, [...(draft?.edits ?? []), ...unsavedEdits]);
            }
            return newRefCache;
        }
    },[useExistingRefCache, refCache, data?.referenceCache, draft?.edits, unsavedEdits]);

    if (useExistingRefCache) {
        return [refCache.entries[entryKey], returnedRefCache, undefined];
    } else {
        return [
            data?.referenceCache?.entries[entryKey],
            // The reference cache with details that may be required to display this enter correctly, such as
            // information about its EntryType, and values of any lookups in the description.
            returnedRefCache,
            error
        ];
    }
}
