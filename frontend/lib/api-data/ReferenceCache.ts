import React from "react";

import * as api from "neolace-api";
import { useDraft } from "./DraftData";

/**
 * In this context, a "reference cache" is available to provide data on any Entry, Entry Type, or Property that is
 * referenced. For example, in the context of an Entry A that links to Entry B, the reference cache will include some
 * details about Entry B such as its Name and friendly ID, so that the link to it can be properly displayed within Entry
 * A.
 */
export const RefCacheContext = React.createContext<
    { refCache?: api.ReferenceCacheData /*, parentRefCache?: api.ReferenceCacheData*/ }
>({
    // Default values for this context:
    refCache: undefined,
});

/**
 * React hook to get the reference cache data, if available in this context
 * @returns
 */
export function useRefCache(options: Record<string, unknown> = {}): api.ReferenceCacheData {
    const context = React.useContext(RefCacheContext);
    const [draft, unsavedEdits] = useDraft();

    return React.useMemo(() => {
        const base = context.refCache ?? {
            entries: {},
            entryTypes: {},
            lookups: [],
            properties: {},
        };
        if (draft?.edits || unsavedEdits.length > 0) {
            // If we're in some context where there are edits from the draft or an editor,
            // apply those edits to the reference cache too.
            const newRefCache = api.applyEditsToReferenceCache(base, [...(draft?.edits ?? []), ...unsavedEdits]);
            return newRefCache;
        }
        return base;
        // We compare context.refCache by value using JSON.stringify since we don't want to re-compute if an identical value is reurned by the API.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(context?.refCache), draft?.edits, unsavedEdits]);
}
