import * as api from "neolace-api";
import useSWR from "swr";

import { client } from "lib/api-client";
import { useSiteData } from "./SiteData";
import { useRefCache } from "./ReferenceCache";

/**
 * React hook to evaluate a lookup expression
 * @returns
 */
 export function useLookupExpression(
    expr: string,
    options: { entryId?: api.VNID; pageSize?: number } = {},
): { resultValue: api.AnyLookupValue | undefined; newReferenceCache: api.ReferenceCacheData; foundInCache: boolean; error?: api.ApiError } {
    const { site } = useSiteData();

    const refCache = useRefCache();

    const valueFromCache = refCache.lookups.find((x) => x.entryContext === options.entryId && x.lookupExpression === expr);

    // TODO: include an entry revision number in this ID
    const key = valueFromCache !== undefined ? "" : `lookup:${site.friendlyId}:${options.entryId ?? "none"}:${options.pageSize ?? "default"}:no-draft:${expr}`;
    const { data, error } = useSWR(key, async () => {
        if (key === "") {
            // The lookup value was found in the reference cache. Do not query the server.
            return undefined;
        }
        if (expr.trim() === "") {
            // If there is no expression, don't bother hitting the API:
            return {
                resultValue: { type: "Null" as const },
                entryContext: options.entryId,
                referenceCache: { entries: {}, entryTypes: {}, lookups: [], properties: {} },
            };
        } else if (site.friendlyId) {
            return await client.evaluateLookupExpression(expr, {
                entryKey: options.entryId,
                siteId: site.friendlyId,
                pageSize: options.pageSize,
            });
        } else {
            return undefined;
        }
    }, {
        // refreshInterval: 10 * 60_000,
    });

    if (valueFromCache !== undefined) {
        return {
            foundInCache: true,
            resultValue: valueFromCache.value,
            newReferenceCache: refCache,
            error: undefined,
        }
    } else {
        return {
            foundInCache: false,
            resultValue: data?.resultValue,
            newReferenceCache: data?.referenceCache ?? refCache,
            error,
        };
    }
}
