/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import React from "react";

import * as SDK from "neolace-sdk";
import { useDraft } from "./DraftData";

/**
 * In this context, a "reference cache" is available to provide data on any Entry, Entry Type, or Property that is
 * referenced. For example, in the context of an Entry A that links to Entry B, the reference cache will include some
 * details about Entry B such as its Name and friendly ID, so that the link to it can be properly displayed within Entry
 * A.
 *
 * For advanced or complex use cases, <MergeRefCache> can be used to combine multiple reference caches together.
 */
export const RefCacheContext = React.createContext<
    { refCache?: SDK.ReferenceCacheData }
>({
    // Default values for this context:
    refCache: undefined,
});

/**
 * React hook to get the reference cache data, if available in this context
 * @returns
 */
export function useRefCache(options: Record<string, unknown> = {}): SDK.ReferenceCacheData {
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
            const newRefCache = SDK.applyEditsToReferenceCache(base, [...(draft?.edits ?? []), ...unsavedEdits]);
            return newRefCache;
        }
        return base;
        // We compare context.refCache by value using JSON.stringify since we don't want to re-compute if an identical value is reurned by the API.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(context?.refCache), draft?.edits, unsavedEdits]);
}
