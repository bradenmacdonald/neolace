import * as check from "neolace/deps/computed-types.ts";
import {
    C,
    Field,
    ValidationError,
    VirtualPropType,
    VNID,
    VNodeType,
    WrappedTransaction,
} from "neolace/deps/vertex-framework.ts";

import { EntryType } from "neolace/core/schema/EntryType.ts";
import { EntryFeatureData } from "neolace/core/entry/features/EntryFeatureData.ts";
import { makeCachedLookup } from "neolace/lib/lru-cache.ts";
import { getGraph } from "neolace/core/graph.ts";
import { PropertyFact } from "./PropertyFact.ts";
import { keyProps } from "../key.ts";

/**
 * An "Entry" is the main "thing" that a Neolace knowledge base contains. Every article is an entry, every image is an
 * entry, every property is an entry, and so on.
 *
 * Every Entry is of a specific EntryType, and the EntryType controls what "features" the entry has (does it have
 * article text attached, or an image attached, or can it be used as a property?)
 */
export class Entry extends VNodeType {
    static label = "Entry";
    static properties = {
        ...VNodeType.properties,
        /** The key of this entry, used in the URL. Site-specific. Can be changed. */
        ...keyProps,
        // The name of this entry
        // This does not need to be unique or include disambiguation - so just put "Drive", not "Drive (computer science)"
        name: Field.String,
        // Description: Short, rich text summary of the thing
        description: Field.String.Check(check.string.trim().max(5_000)),
    };

    static readonly rel = this.hasRelationshipsFromThisTo({
        /** The type of this entry */
        IS_OF_TYPE: {
            to: [EntryType],
            cardinality: VNodeType.Rel.ToOneRequired,
        },
        /** This Entry has property values */
        PROP_FACT: {
            to: [PropertyFact],
            cardinality: VNodeType.Rel.ToManyUnique,
        },
        /** This Entry has data about special features that are enabled (for example if it has Article text) */
        HAS_FEATURE_DATA: {
            to: [EntryFeatureData],
            cardinality: VNodeType.Rel.ToManyUnique,
        },
        // If this Entry has an explicit relationship to other entries (via PropertyFact), it will also have a direct
        // IS_A/RELATES_TO relationship to the Entry on the Neo4j graph, which makes computing ancestors of an Entry
        // much simpler, and makes working with the graph easier.
        IS_A: {
            to: [this],
            cardinality: VNodeType.Rel.ToMany,
        },
        RELATES_TO: {
            to: [this],
            cardinality: VNodeType.Rel.ToMany,
        },
    });

    static virtualProperties = this.hasVirtualProperties(() => ({
        type: {
            type: VirtualPropType.OneRelationship,
            query: C`(@this)-[:${this.rel.IS_OF_TYPE}]->(@target:${EntryType})`,
            target: EntryType,
        },
        featureData: {
            type: VirtualPropType.ManyRelationship,
            query: C`(@this)-[:${this.rel.HAS_FEATURE_DATA}]->(@target:${EntryFeatureData})`,
            target: EntryFeatureData,
        },
    }));

    static override async validateExt(vnodeIds: VNID[], tx: WrappedTransaction): Promise<void> {
        // Check that the siteNamespace matches the site, and the key has the correct prefix, if applicable
        const rows = await tx.pull(
            Entry,
            (e) => e.siteNamespace.key.type((t) => t.keyPrefix.site((s) => s.id)),
            {
                where: C`@this.id IN ${vnodeIds}`,
            },
        );
        for (const entryData of rows) {
            const siteId = entryData.type?.site?.id;
            if (!siteId) {
                throw new ValidationError("Entry is unexpectedly not linked to a site.");
            }
            if (entryData.siteNamespace !== siteId) {
                throw new ValidationError("Entry has incorrect siteNamespace.");
            }

            // Check the keyPrefix:
            const keyPrefix = entryData.type?.keyPrefix;
            if (keyPrefix && !entryData.key.startsWith(keyPrefix)) {
                throw new ValidationError(`Invalid key; expected it to start with ${keyPrefix}`);
            }
        }

        // Validate that all IS_A/RELATES_TO relationships have corresponding PropertyFacts
        const isACheck = await tx.query(C`
            MATCH (entry:${this})
                WHERE entry.id IN ${vnodeIds}
            MATCH (entry)-[rel:${this.rel.IS_A}|${this.rel.RELATES_TO}]->(otherEntry:VNode)
            WITH entry, id(rel) AS expectedId
            OPTIONAL MATCH (entry)-[:${this.rel.PROP_FACT}]->(relFact:${PropertyFact} {directRelNeo4jId: expectedId})
            RETURN expectedId, relFact.directRelNeo4jId AS actualId
        `.givesShape({ expectedId: Field.VNID, actualId: Field.VNID }));
        if (!isACheck.every((row) => row.actualId === row.expectedId)) {
            throw new ValidationError(
                `An Entry has a stranded direct relationship without a corresponding PropertyFact`,
            );
        }
    }
}

/** Cached helper function to look up an entry's siteId (Site VNID) */
export const siteIdForEntryId = makeCachedLookup(async (entryId: VNID) => {
    if (entryId === undefined) {
        throw new Error("Unexpectedly got undefined for entryId - will cause an error with site lookup.");
    }
    const graph = await getGraph();
    const result = (await graph.pullOne(Entry, (e) => e.type((et) => et.site((s) => s.id)), { id: entryId })).type
        ?.site?.id;
    if (!result) {
        throw new Error("Invalid Entry ID");
    }
    return result;
}, 10_000);
