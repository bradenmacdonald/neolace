import * as api from "neolace-api";
import useSWR from "swr";

import { client } from "lib/api-client";
import { useSiteData } from "./SiteData";
import { useUser } from "./User";

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

    const key = `entry:${site.shortId}:${entryKey}:${userKey}:no-draft`;
    const { data, error } = useSWR(key, async () => {
        if (siteError) {
            throw new api.ApiError("Site Error", 500);
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
