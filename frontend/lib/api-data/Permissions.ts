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
    const [draft] = useDraft(context);

    // Get the user's permissions, in the given context:
    const key = `user-permissions:${site.friendlyId}:${user.username}:${context?.entryId ?? ""}:${draft?.idNum ?? ""}`;
    const { data, error } = useSWR(key, async () => {
        if (siteError) {
            throw new api.ApiError("Site Error", 500);
        }
        if (!site.friendlyId) {
            return undefined; // We need to wait for the siteId before we can load the entry
        }
        return client.getMyPermissions({ entryId: context?.entryId, draftIdNum: draft?.idNum, siteId: site.friendlyId });
    }, {
        // refreshInterval: 10 * 60_000,
    });

    if (error) {
        console.error(error);
    }
    return data;
}
/**
 * React hook to get the user's permissions in a certain context.
 */
 export function usePermission(perm: api.CorePerm, context?: {
    /** The ID of the entry, if we want to know entry-specific information */
    entryId?: api.VNID;
    draftContext?: DraftContextData;
}): boolean {
    const permissions = usePermissions(context);
    return permissions?.[perm]?.hasPerm ?? false;
}
