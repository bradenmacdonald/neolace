import React from "react";
import * as api from "neolace-api";
import useSWR, { KeyedMutator } from "swr";
import { client } from "lib/api-client";
import { useSiteData } from "./SiteData";

type DraftDataWithEdits = Required<api.DraftData>;

export interface DraftContextData {
    draftIdNum: number | "_" | undefined;
    unsavedEdits: ReadonlyArray<api.AnyEdit>;
}

/**
 * In this context, there is a "current draft ID". e.g. when editing a draft
 */
export const DraftContext = React.createContext<DraftContextData>({
    // Default values for this context:
    draftIdNum: undefined,
    /**
     * Edits that have been made in the UI in the browser but not yet saved into the draft (they'll be lost if the
     * browser window is closed).
     */
    unsavedEdits: [],
});

/**
 * React hook to get a draft.
 */
export function useDraft(
    /**
     * The draft data normally comes automatically from a <DraftContext.Provider> in a parent element, but if you need
     * to use this in the same component that *creates* the <DraftContext.Provider>, then you can pass the data about
     * the draft in via this parameter.
     */
    context: { draftContext?: DraftContextData } = {},
): [
    data: DraftDataWithEdits | undefined,
    unsavedEdits: ReadonlyArray<api.AnyEdit>,
    error: api.ApiError | undefined,
    mutate: KeyedMutator<DraftDataWithEdits | undefined>,
] {
    const { site, siteError } = useSiteData();
    const _autoDraftContext = React.useContext(DraftContext);
    const draftContext = context.draftContext || _autoDraftContext;
    const draftIdNum = draftContext.draftIdNum;

    const key = `draft:${site.friendlyId}:${draftIdNum}`;
    const { data, error, mutate } = useSWR(key, async (): Promise<DraftDataWithEdits | undefined> => {
        if (siteError) {
            throw new api.ApiError("Site Error", 500);
        }
        if (draftIdNum === "_" || draftIdNum === undefined) {
            return undefined;
        }
        if (!site.friendlyId) {
            return undefined; // We need to wait for the siteId before we can load the draft
        }
        return await client.getDraft(draftIdNum, {
            flags: [
                api.GetDraftFlags.IncludeEdits,
            ] as const,
            siteId: site.friendlyId,
        });
    }, {
        // refreshInterval: 10 * 60_000,
    });

    return [data, draftContext.unsavedEdits, error, mutate];
}

/**
 * React hook to correctly get any "pending" edits - edits which are in the current draft (IFF it hasn't been applied
 * yet), and unsaved edits which are in the react state while the user is actively making changes to the draft, but
 * which may be discarded before being saved into a draft.
 */
 export function usePendingEdits(
    /**
     * The draft data normally comes automatically from a <DraftContext.Provider> in a parent element, but if you need
     * to use this in the same component that *creates* the <DraftContext.Provider>, then you can pass the data about
     * the draft in via this parameter.
     */
    context: { draftContext?: DraftContextData } = {},
): api.AnyEdit[] {
    const [draft, unsavedEdits] = useDraft();

    const result: api.AnyEdit[] = React.useMemo(() => {
        if (draft && draft.status === api.DraftStatus.Open) {
            return [...draft.edits, ...unsavedEdits];
        } else {
            return [...unsavedEdits];
        }
    }, [draft, unsavedEdits]);

    return result;
}
