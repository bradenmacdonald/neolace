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
import { useUser } from "./User";
import { useSiteData } from "./SiteData";
import { DraftContextData, useDraft } from "./DraftData";

/**
 * React hook to get the user's permissions in a certain context.
 */
export function usePermissions(context?: {
    /** The ID of the entry, if we want to know entry-specific information */
    entryId?: SDK.VNID;
    draftContext?: DraftContextData;
}): SDK.SiteUserMyPermissionsData | undefined {
    const user = useUser();
    const { site, siteError } = useSiteData();

    // Get the draft, if set.
    const [draft] = useDraft(context);

    // Get the user's permissions, in the given context:
    const key = `user-permissions:${site.key}:${user.username}:${context?.entryId ?? ""}:${draft?.num ?? ""}`;
    const { data, error } = useSWR(key, async () => {
        if (siteError) {
            throw new SDK.ApiError("Site Error", 500);
        }
        if (!site.key) {
            return undefined; // We need to wait for the siteKey before we can load the entry
        }
        return client.getMyPermissions({ entryId: context?.entryId, draftNum: draft?.num, siteKey: site.key });
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
 export function usePermission(perm: SDK.CorePerm, context?: {
    /** The ID of the entry, if we want to know entry-specific information */
    entryId?: SDK.VNID;
    draftContext?: DraftContextData;
}): boolean {
    const permissions = usePermissions(context);
    return permissions?.[perm]?.hasPerm ?? false;
}
