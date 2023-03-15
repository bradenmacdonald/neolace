/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import * as SDK from "neolace-sdk";
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
    options: { entryId?: SDK.VNID; pageSize?: number } = {},
): { resultValue: SDK.AnyLookupValue | undefined; newReferenceCache: SDK.ReferenceCacheData; foundInCache: boolean; error?: SDK.ApiError } {
    const { site } = useSiteData();

    const refCache = useRefCache();

    const valueFromCache = refCache.lookups.find((x) => x.entryContext === options.entryId && x.lookupExpression === expr);

    // TODO: include an entry revision number in this ID
    const key = valueFromCache !== undefined ? "" : `lookup:${site.key}:${options.entryId ?? "none"}:${options.pageSize ?? "default"}:no-draft:${expr}`;
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
        } else if (site.key) {
            return await client.evaluateLookupExpression(expr, {
                entryKey: options.entryId,
                siteKey: site.key,
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
