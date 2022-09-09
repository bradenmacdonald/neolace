import * as api from "neolace-api";
import useSWR from "swr";

import { client } from "lib/api-client";
import { useSiteData } from "./SiteData";

/**
 * React hook to evaluate a lookup expression
 * @returns
 */
 export function useLookupExpression(
    expr: string,
    options: { entryId?: api.VNID; pageSize?: number } = {},
): { result: api.EvaluateLookupData | undefined; error: api.ApiError } {
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
