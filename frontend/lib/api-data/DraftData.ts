import React from "react";
import * as SDK from "neolace-sdk";
import useSWR, { KeyedMutator } from "swr";
import { client } from "lib/api-client";
import { useSiteData } from "./SiteData";

type DraftDataWithEdits = Required<SDK.DraftData>;

export interface DraftContextData {
    draftNum: number | "_" | undefined;
    unsavedEdits: ReadonlyArray<SDK.AnyEdit>;
}

/**
 * In this context, there is a "current draft ID". e.g. when editing a draft
 */
export const DraftContext = React.createContext<DraftContextData>({
    // Default values for this context:
    draftNum: undefined,
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
    unsavedEdits: ReadonlyArray<SDK.AnyEdit>,
    error: SDK.ApiError | undefined,
    mutate: KeyedMutator<DraftDataWithEdits | undefined>,
] {
    const { site, siteError } = useSiteData();
    const _autoDraftContext = React.useContext(DraftContext);
    const draftContext = context.draftContext || _autoDraftContext;
    const draftNum = draftContext.draftNum;

    const key = `draft:${site.key}:${draftNum}`;
    const { data, error, mutate } = useSWR(key, async (): Promise<DraftDataWithEdits | undefined> => {
        if (siteError) {
            throw new SDK.ApiError("Site Error", 500);
        }
        if (draftNum === "_" || draftNum === undefined) {
            return undefined;
        }
        if (!site.key) {
            return undefined; // We need to wait for the siteKey before we can load the draft
        }
        return await client.getDraft(draftNum, {
            flags: [
                SDK.GetDraftFlags.IncludeEdits,
            ] as const,
            siteKey: site.key,
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
): SDK.AnyEdit[] {
    const [draft, unsavedEdits] = useDraft(context);

    const result: SDK.AnyEdit[] = React.useMemo(() => {
        if (draft && draft.status === SDK.DraftStatus.Open) {
            return [...draft.edits, ...unsavedEdits];
        } else {
            return [...unsavedEdits];
        }
    }, [draft, unsavedEdits]);

    return result;
}
