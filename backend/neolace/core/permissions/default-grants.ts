import * as log from "std/log/mod.ts";
import { VNID } from "neolace/deps/vertex-framework.ts";
import { getGraph } from "neolace/core/graph.ts";
import { AccessMode, Site, siteShortIdFromId } from "neolace/core/Site.ts";
import { Always, DraftSelfAuthoredCondition, IfLoggedIn, PermissionGrant } from "./grant.ts";

// These grants are always enabled for all sites
const coreGrants: PermissionGrant[] = [
    // Users can only edit their own drafts:
    new PermissionGrant(new DraftSelfAuthoredCondition(), ["edit.draft"]),
];

/**
 * Every site has an "Access Mode" that determines the base permission grants applied to that site.
 */
export const defaultGrants: Record<AccessMode, readonly PermissionGrant[]> = Object.freeze({
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
 */
export async function getSitePublicGrants(siteId: VNID): Promise<PermissionGrant[]> {
    // TODO: use this to cache, once we have the ability to clear the cache whenever the site is updated.
    // const cacheKey = `getSitePublicGrants.siteData.${siteId})`;
    // const [accessMode, publicGrantStrings] = await useRedisCache<[string, string[]]>(cacheKey, async () => {
    //     const graph = await getGraph();
    //     const site = await graph.pullOne(Site, (s) => s.accessMode.publicGrantStrings, { key: siteId });
    //     return [site.accessMode, site.publicGrantStrings ?? []];
    // });
    const graph = await getGraph();
    const site = await graph.pullOne(Site, (s) => s.accessMode.publicGrantStrings, { key: siteId });
    const [accessMode, publicGrantStrings] = [site.accessMode, site.publicGrantStrings ?? []];

    const grants = [...defaultGrants[accessMode as AccessMode]] ?? [];
    for (const publicGrantString of (publicGrantStrings ?? [])) {
        try {
            grants.push(PermissionGrant.parse(publicGrantString));
        } catch (err) {
            const shortId = await siteShortIdFromId(siteId);
            log.error(`Unable to parse public grant string "${publicGrantString}" for site ${shortId}`, err);
        }
    }
    return grants;
}
