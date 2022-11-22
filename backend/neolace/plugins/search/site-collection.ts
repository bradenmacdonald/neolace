import { C, EmptyResultError, Field, VNID } from "neolace/deps/vertex-framework.ts";
import { getGraph, Site, siteFriendlyIdFromId } from "neolace/plugins/api.ts";
import { getTypeSenseClient } from "./typesense-client.ts";
import { SearchPluginIndexConfig, UpdateSiteApiKey } from "./SearchPluginIndexConfig.ts";

/**
 * Every site's entries are indexed in a TypeSense collection with a version in the name, like
 * "technotes_entries_20201205". There is an alias collection with a simpler name like "technotes_entries" that points
 * to the current collection. This function returns the name of that alias collection, from which all searches/reads
 * should happen.
 */
export async function getSiteCollectionAlias(siteId: VNID): Promise<string> {
    const siteFriendlyId = await siteFriendlyIdFromId(siteId);
    return `${siteFriendlyId}-entries`;
}

/**
 * For each site, we manage a TypeSense API key that has the "documents:search" permission scoped to just that one
 * site's collection. (The collection is an alias that points to the current version.)
 *
 * We do not return this API key to users directly, because it allows searching ALL entries on that site, and the
 * current user may only have permission to view a subset of those entries. So we use this key to generate a sub-key,
 * with more limited permissions, which is what we send back to the user.
 */
export async function getSiteSpecificApiKey(siteId: VNID): Promise<string> {
    const [graph, client] = await Promise.all([getGraph(), getTypeSenseClient()]);

    // TODO: need a way to reset the key in case it stops working or is compromised.
    // await graph.runAsSystem(UpdateSiteApiKey({ siteId, apiKey: "" }));

    try {
        const initialResult = await graph.read((tx) =>
            tx.queryOne(C`
            MATCH (site:${Site} {id: ${siteId}})
            MATCH (site)<-[:${SearchPluginIndexConfig.rel.FOR_SITE}]-(config:${SearchPluginIndexConfig})
        `.RETURN({ "config.searchApiKey": Field.String }))
        );
        if (initialResult["config.searchApiKey"]) {
            return initialResult["config.searchApiKey"];
        }
    } catch (err) {
        if (err instanceof EmptyResultError) {
            // Ignore, that means we continue below to create a new API key
        } else {
            throw err; // Something went wrong!
        }
    }
    const [friendlyId, siteCollection] = await Promise.all([
        siteFriendlyIdFromId(siteId),
        getSiteCollectionAlias(siteId),
    ]);

    // Create a new API key and save it into the graph.
    const keyData = await client.keys().create({
        description: `Entry Search key for ${friendlyId}`,
        // This key can only be used for searching:
        actions: ["documents:search"],
        // This key can only search the collection of entries belonging to this site:
        collections: [siteCollection],
    });
    const apiKey = keyData.value;
    if (apiKey === undefined) {
        throw new Error("Search key creation failed.");
    }

    await graph.runAsSystem(UpdateSiteApiKey({ siteId, apiKey }));

    return apiKey;
}
