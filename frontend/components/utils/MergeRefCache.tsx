import React from "react";
import { SDK } from "lib/sdk";
import { RefCacheContext, useRefCache } from "lib/api-data/ReferenceCache";

/**
 * Combine one or more additional reference caches with any existing reference cache, and make the combination
 * available to all child components in the React tree.
 */
export const MergeRefCache: React.FunctionComponent<{
    mergeCaches: SDK.ReferenceCacheData[],
    children: React.ReactNode,
}> = ({mergeCaches, children}) => {
    const existingRefCache = useRefCache();

    const mergedRefCache = React.useMemo(() => {
        const refCache = {
            entries: {...existingRefCache.entries},
            entryTypes: {...existingRefCache.entryTypes},
            lookups: [...existingRefCache.lookups],
            properties: {...existingRefCache.properties},
        };
        for (const additional of mergeCaches) {
            refCache.entries = {...refCache.entries, ...additional.entries};
            refCache.entryTypes = {...refCache.entryTypes, ...additional.entryTypes};
            refCache.lookups = [...refCache.lookups, ...additional.lookups];
            refCache.properties = {...refCache.properties, ...additional.properties};
        }
        return refCache;
    }, [existingRefCache, mergeCaches]);

    return <RefCacheContext.Provider value={{refCache: mergedRefCache}}>
        {children}
    </RefCacheContext.Provider>
};
