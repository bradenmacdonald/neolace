import { VNID } from "neolace/deps/vertex-framework.ts";
import { getGraph } from "neolace/core/graph.ts";
import { AccessMode, Site } from "neolace/core/Site.ts";
import { Always, DraftSelfAuthoredCondition, IfLoggedIn, PermissionGrant } from "./grant.ts";

// These grants are always enabled for all sites
const coreGrants: PermissionGrant[] = [
    // Users can only edit their own drafts:
    new PermissionGrant(new DraftSelfAuthoredCondition(), ["edit.draft"]),
];

/**
 * Every site has an "Access Mode" that determines the base permission grants applied to that site.
 */
export const defaultGrants: Record<AccessMode, PermissionGrant[]> = Object.freeze({
    [AccessMode.Private]: [
        ...coreGrants,
        // A private site grants absolutely no other permissions at all to any users by default
    ],
    [AccessMode.PublicReadOnly]: [
        ...coreGrants,
        // Anyone can view the site, its entries, drafts, and its schema - without logging in:
        new PermissionGrant(Always, ["view*"]),
    ],
    [AccessMode.PublicContributions]: [
        ...coreGrants,
        // Anyone can view the site, its entries, drafts, and its schema - without logging in:
        new PermissionGrant(Always, ["view*"]),
        // Registered users can propose edits:
        new PermissionGrant(IfLoggedIn, ["proposeEdits*"]),
    ],
});

/**
 * Get the grants which apply to _everyone_ (logged in or not) for the given site
 * TODO: cache this in Redis and clear the cache when the site is updated.
 */
export async function getSitePublicGrants(siteId: VNID) {
    const graph = await getGraph();
    const site = await graph.pullOne(Site, (s) => s.accessMode, { key: siteId });
    const grants = defaultGrants[site.accessMode as AccessMode] ?? [];
    // TODO: also pull in a 'public grants' field from the site with additional permissions that everyone gets.
    return grants;
}
