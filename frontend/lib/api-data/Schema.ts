import React from "react";
import * as api from "neolace-api";
import useSWR from "swr";
import { client } from "lib/api-client";
import { useSiteData } from "./SiteData";
import { DraftContextData, usePendingEdits } from "./DraftData";

/**
 * React hook to get the current site's schema, including any edits made within the current draft.
 * @returns
 */
export function useSchema(
    context: { draftContext?: DraftContextData } = {},
): [data: api.SiteSchemaData | undefined, error: api.ApiError | undefined] {
    const { site, siteError } = useSiteData();

    const key = `siteSchema:${site.key}`;
    const { data: baseSchema, error } = useSWR(key, async () => {
        if (siteError) {
            throw new api.ApiError("Site Error", 500);
        }
        if (!site.key) {
            return undefined; // We need to wait for the siteKey before we can load the entry
        }
        return await client.getSiteSchema({ siteKey: site.key });
    }, {
        // refreshInterval: 10 * 60_000,
    });

    // Apply any edits from the draft, if present:
    const edits = usePendingEdits(context);
    const schema = React.useMemo(() => {
        if (baseSchema === undefined) {
            // Base schema hasn't loaded yet.
        } else if (edits.length > 0) {
            const schema = api.applyEditsToSchema(baseSchema, edits);
            return schema;
        } else {
            return baseSchema;
        }
    }, [baseSchema, edits]);

    return [schema, error];
}
