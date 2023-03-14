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
import useSWR from "swr";

import { client } from "lib/api-client";
import { useSiteData } from "./SiteData";
import { DraftContextData, useDraft } from "./DraftData";
import { useSchema } from "./Schema";

/**
 * React hook to get an editable version of the entry (including all editable properties, not just the "top" properties
 * seen in the property summary).
 * This is aware of the DraftContext and will apply any edits and unsaved edits from the draft, if present.
 */
export function useEditableEntry(
    /** The ID of the entry. May be a new entry if the draft context contains a 'CreateEntry' edit. */
    entryId: SDK.VNID,
    /** Is this a new entry? If so we won't try to load the "base version" from the server. */
    isNewEntry: boolean,
    /**
     * The draft data normally comes automatically from a <DraftContext.Provider> in a parent element, but if you need
     * to use this in the same component that *creates* the <DraftContext.Provider>, then you can pass the data about
     * the draft in via this parameter.
     */
    context: { draftContext?: DraftContextData },
): [
    data: SDK.EditableEntryData | undefined,
    error: SDK.ApiError | undefined,
    // mutate: KeyedMutator<api.EditableEntryData | undefined>,
] {
    const { site, siteError } = useSiteData();
    // Get the site schema. We don't need the draft's edits to be applied to it.
    const [baseSchema] = useSchema();

    // Get the draft, if set.
    const [draft, unsavedEdits, draftError] = useDraft(context);

    // Get the "base version" of the entry (currently published version), if it exists.
    const key = `entry-edit:${site.key}:${entryId}`;
    const { data: baseEntry, error } = useSWR(key, async () => {
        if (siteError) {
            throw new SDK.ApiError("Site Error", 500);
        }
        if (!SDK.isVNID(entryId)) {
            throw new SDK.ApiError(`"${entryId}" is not a valid VNID`, 500);
        }
        if (!site.key) {
            return undefined; // We need to wait for the siteKey before we can load the entry
        }
        let data: SDK.EditableEntryData = {
            // Start with blank entry data:
            id: entryId,
            key: "",
            name: "",
            description: "",
            entryType: { key: "", name: "" },
            features: {},
            propertiesRaw: [],
        };
        if (!isNewEntry) {
            try {
                data = await client.getEntry(entryId, {
                    flags: [
                        SDK.GetEntryFlags.IncludeFeatures,
                        SDK.GetEntryFlags.IncludeRawProperties,
                    ] as const,
                    siteKey: site.key,
                });
            } catch (err) {
                if (err instanceof SDK.NotFound) {
                    // No such entry exists. But it may exist within the draft, if it was previously created and saved
                    // to this draft. So for now we just return a blank entry. We can't check if it exists within the
                    // draft here because this useSWR fetcher is not keyed to the draft's edits so shouldn't use them.
                } else throw err;
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
        const edits: SDK.AnyEdit[] = [...(draft?.edits ?? []), ...unsavedEdits];
        return baseEntry && baseSchema ? SDK.applyEditsToEntry(baseEntry, baseSchema, edits) : undefined;
    }, [baseEntry, baseSchema, draft?.edits, unsavedEdits]);

    return [entry, error];
}
