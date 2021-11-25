import * as check from "neolace/deps/computed-types.ts";
import {
    DerivedProperty,
    VirtualPropType,
    C,
    VNodeType,
    Field,
    RawVNode,
    WrappedTransaction,
    ValidationError,
    VNID,
} from "neolace/deps/vertex-framework.ts";

import { EntryType } from "neolace/core/schema/EntryType.ts";
import { slugIdToFriendlyId } from "neolace/core/Site.ts";
import { EntryFeatureData } from "neolace/core/entry/features/EntryFeatureData.ts";
import { makeCachedLookup } from "neolace/lib/lru-cache.ts";
import { graph } from "neolace/core/graph.ts";
import { PropertyFact } from "./PropertyFact.ts";


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
        // slugId: The friendlyId along with a Site-specific prefix.
        // See arch-decisions/007-sites-multitenancy for details.
        slugId: Field.Slug,
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

    static derivedProperties = this.hasDerivedProperties({
        friendlyId,
    });

    static async validate(dbObject: RawVNode<typeof this>, tx: WrappedTransaction): Promise<void> {
        // Check that the slugId is prefixed with the site code.
        const entryData = await tx.pullOne(Entry, e => e.type(t => t.friendlyIdPrefix.site(s => s.siteCode)), {key: dbObject.id});
        const siteCode = entryData.type?.site?.siteCode;
        if (!siteCode) {
            throw new ValidationError("Entry is unexpectedly not linked to a site with a sitecode.");
        }
        if (dbObject.slugId.substr(0, 5) !== siteCode) {
            throw new ValidationError("Entry's slugId does not start with the site code.");
        }

        // Check the friendlyIdPrefix:
        const friendlyIdPrefix = entryData.type?.friendlyIdPrefix;
        if (friendlyIdPrefix && !dbObject.slugId.substr(5).startsWith(friendlyIdPrefix)) {
            throw new ValidationError(`Invalid friendlyId; expected it to start with ${friendlyIdPrefix}`);
        }

        // Validate that all IS_A/RELATES_TO relationships have corresponding PropertyFacts
        const isACheck = await tx.query(C`
            MATCH (entry:${this} {id: ${dbObject.id}})
            MATCH (entry)-[rel:${this.rel.IS_A}|${this.rel.RELATES_TO}]->(otherEntry:VNode)
            WITH entry, id(rel) AS expectedId
            OPTIONAL MATCH (entry)-[:${this.rel.PROP_FACT}]->(relFact:${PropertyFact} {directRelNeo4jId: expectedId})
            RETURN expectedId, relFact.directRelNeo4jId AS actualId
        `.givesShape({expectedId: Field.VNID, actualId: Field.VNID}));
        if (!isACheck.every(row => row.actualId === row.expectedId)) {
            throw new ValidationError(`Entry ${dbObject.id} (${dbObject.slugId}) has a stranded direct relationship without a corresponding PropertyFact`);
        }
    }

}


/**
 * A property that provides the slugId without its site-specific prefix
 * See arch-decisions/007-sites-multitenancy for details.
 */
export function friendlyId(): DerivedProperty<string> { return DerivedProperty.make(
    Entry,
    e => e.slugId,
    e => slugIdToFriendlyId(e.slugId),
);}


/** Cached helper function to look up an entry's siteId (Site VNID) */
export const siteIdForEntryId = makeCachedLookup(async (entryId: VNID) => {
    const result = (await graph.pullOne(Entry, e => e.type(et => et.site(s => s.id)), {key: entryId})).type?.site?.id;
    if (!result) {
        throw new Error("Invalid Entry ID");
    }
    return result;
}, 10_000);
