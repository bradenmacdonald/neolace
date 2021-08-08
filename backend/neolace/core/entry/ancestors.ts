import {
    C,
    Field,
    WrappedTransaction,
    VNID,
} from "neolace/deps/vertex-framework.ts";

import { slugIdToFriendlyId } from "neolace/core/Site.ts";
import { Entry } from "neolace/core/entry/Entry.ts";


type Ancestor = {id: VNID, name: string, friendlyId: string, distance: number};

/**
 * Helper function to compute the ancestors of an entry.
 *
 * Returns up to 100 ancestors, up to 50 levels deep. Not paginated.
 * Returns each ancestor only once and reports the shortest distance (# of relationship hops) to that ancestor.
 * Can be used on data with cyclic relationships, and will never return the starting entry as its own ancestor.
 *
 * @param entryId The VNID of the entry in question
 * @param tx The Neo4j transaction to use
 * @returns 
 */
export async function getEntryAncestors(entryId: VNID, tx: WrappedTransaction) {
    const ancData = await tx.query(C`
        MATCH (entry:${Entry} {id: ${entryId}})
        CALL apoc.path.expandConfig(entry, {
            sequence: ">VNode,HAS_REL_FACT>,VNode,IS_A>",
            minLevel: 1,
            maxLevel: 50,
            uniqueness: "NODE_GLOBAL",
            limit: 100
        })
        YIELD path
        WITH length(path)/2 AS distance, last(nodes(path)) AS ancestor
        // We want to only return DISTINCT ancestors, and return only the minimum distance to each one.
        // We are now handling with with the 'uniqueness: "NODE_GLOBAL"' argument above; an alternative is shown below:
        // WITH ancestor, min(distance) AS distance
        RETURN ancestor.id AS id, ancestor.name AS name, ancestor.slugId as slugId, distance
        ORDER BY distance, ancestor.name
        LIMIT 100
    `.givesShape({id: Field.VNID, name: Field.String, slugId: Field.String, distance: Field.Int}));
    return ancData.map(e => ({
        id: e.id,
        name: e.name,
        friendlyId: slugIdToFriendlyId(e.slugId),
        distance: e.distance,
    }));
}
