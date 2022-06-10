import { VNID } from "neolace/deps/vertex-framework.ts";

export interface ActionSubject {
    /** The user's VNID, or undefined for an anonymous user (someone who is not logged in) */
    userId: VNID | undefined;
    /** The VNID of the current site. (If the action isn't specific to a site, this will be the ID of the home site) */
    siteId: VNID;
}

/**
 * What object the user is trying to access. Usually only one value is specified, but sometimes more than one, such as
 * when checking if the user has permission to read a specific property on a specific entry (entryId and propertyId
 * would be specified).
 */
export interface ActionObject {
    /** The entry ID in question, if relevant */
    entryId?: VNID;
    /** The entry type ID in question, if known/relevant */
    entryTypeId?: VNID;
    /** The draft ID in question, if relevant */
    draftId?: VNID;
    [other: `plugin:${string}`]: unknown;
}
