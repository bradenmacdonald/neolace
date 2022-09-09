import * as api from "neolace-api";
import useSWR from "swr";
import { client } from "lib/api-client";
import { useUser } from "./User";
import { useSiteData } from "./SiteData";
import { DraftContextData, useDraft } from "./DraftData";
/**
 * React hook to get the user's permissions in a certain context.
 */
export function usePermissions(context?: {
    /** The ID of the entry, if we want to know entry-specific information */
    entryId?: api.VNID;
    draftContext?: DraftContextData;
}): api.SiteUserMyPermissionsData | undefined {
    const user = useUser();
    const { site, siteError } = useSiteData();

    // Get the draft, if set.
    const [draft, unsavedEdits, _draftError] = useDraft(context);

    // Get the user's permissions, in the given context:
    const key = `user-permissions:${user.username}:${context?.entryId ?? ""}:${draft?.id ?? ""}`;
    const { data, error } = useSWR(key, async () => {
        if (siteError) {
            throw new api.ApiError("Site Error", 500);
        }
        if (!site.shortId) {
            return undefined; // We need to wait for the siteId before we can load the entry
        }
        return client.getMyPermissions({ entryId: context?.entryId, draftId: draft?.id, siteId: site.shortId });
    }, {
        // refreshInterval: 10 * 60_000,
    });

    if (error) {
        console.error(error);
    }
    return data;
}
