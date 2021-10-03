import * as check from "neolace/deps/computed-types.ts";
import { RelationshipCategory } from "neolace/deps/neolace-api.ts";
import {
    C,
    Field,
    RawVNode,
    ValidationError,
    VirtualPropType,
    VNodeType,
    WrappedTransaction,
} from "neolace/deps/vertex-framework.ts";
import { Site } from "neolace/core/Site.ts";
import {EntryType} from "neolace/core/schema/EntryType.ts";


/**
 * A RelationshipType declares a "type" of relationship between two entries
 */
export class RelationshipType extends VNodeType {
    static label = "RelationshipType";
    static properties = {
        ...VNodeType.properties,
        /** The name of this RelationshipType (e.g. FROM_ENTRY_TYPE "is derived from" TO_ENTRY_TYPE) */
        nameForward: Field.String,
        /** The name of the reverse of this RelationshipType (e.g. TO_ENTRY_TYPE "has derivatives" FROM_ENTRY_TYPE) */
        nameReverse: Field.String,
        /** Description: Short, rich text summary of the relationship  */
        description: Field.NullOr.String.Check(check.string.trim().max(5_000)),
        /** Relationship category - cannot be changed */
        category: Field.String.Check(check.Schema.enum(RelationshipCategory)),
    };

    static readonly rel = this.hasRelationshipsFromThisTo({
        /** Which Site this relationship type is part of */
        FOR_SITE: {
            to: [Site],
            cardinality: VNodeType.Rel.ToOneRequired,
        },
        /** Which Entry Types this relationship can be from */
        FROM_ENTRY_TYPE: {
            to: [EntryType],
            cardinality: VNodeType.Rel.ToManyUnique,
        },
        TO_ENTRY_TYPE: {
            to: [EntryType],
            cardinality: VNodeType.Rel.ToManyUnique,
        },
    });

    static virtualProperties = this.hasVirtualProperties({
        site: {
            type: VirtualPropType.OneRelationship,
            query: C`(@this)-[:${this.rel.FOR_SITE}]->(@target)`,
            target: Site,
        },
        fromTypes: {
            type: VirtualPropType.ManyRelationship,
            query: C`(@this)-[:${this.rel.FROM_ENTRY_TYPE}]->(@target)`,
            target: EntryType,
        },
        toTypes: {
            type: VirtualPropType.ManyRelationship,
            query: C`(@this)-[:${this.rel.TO_ENTRY_TYPE}]->(@target)`,
            target: EntryType,
        },
    });

    static derivedProperties = this.hasDerivedProperties({
        // numRelatedImages,
    });

    static async validate(dbObject: RawVNode<typeof RelationshipType>, tx: WrappedTransaction): Promise<void> {
        // Make sure each entry type is from the same site:
        await tx.pullOne(
            RelationshipType,
            rt => rt.site(s => s.id).fromTypes(et => et.site(s => s.id)).toTypes(et => et.site(s => s.id)),
            {key: dbObject.id}
        ).then(rt => {
            const siteId = rt.site?.id;
            if (siteId === undefined) { throw new Error("Site missing - shouldn't happen"); }
            rt.fromTypes.forEach(et => {
                if (et.site?.id !== siteId) {
                    throw new ValidationError("RelationshipType is from a different Site.");
                }
            });
            rt.toTypes.forEach(et => {
                if (et.site?.id !== siteId) {
                    throw new ValidationError("RelationshipType is to a different Site.");
                }
            });
        });
    }

}
