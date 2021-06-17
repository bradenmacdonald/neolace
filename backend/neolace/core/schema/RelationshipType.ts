import {
    C,
    Field,
    RawVNode,
    ValidationError,
    VirtualPropType,
    VNodeType,
    VNodeTypeRef,
    WrappedTransaction,
} from "vertex-framework";
import { Site } from "../Site";
import { EntryType } from "./EntryType";
import { RelationshipCategory } from "neolace-api";


/**
 * A RelationshipType declares a "type" of relationship between two entries
 */
@VNodeType.declare
export class RelationshipType extends VNodeType {
    static label = "RelationshipType";
    static properties = {
        ...VNodeType.properties,
        /** The name of this RelationshipType (e.g. FROM_ENTRY_TYPE "is derived from" TO_ENTRY_TYPE) */
        nameForward: Field.String,
        /** The name of the reverse of this RelationshipType (e.g. TO_ENTRY_TYPE "has derivatives" FROM_ENTRY_TYPE) */
        nameReverse: Field.String,
        /** Description: Short, rich text summary of the relationship  */
        description: Field.NullOr.String.Check(desc => desc.max(5_000)),
        /** Relationship category - cannot be changed */
        category: Field.String.Check(c => c.valid(
            RelationshipCategory.IS_A,
            RelationshipCategory.HAS_A,
        )),
    };

    static readonly rel = VNodeType.hasRelationshipsFromThisTo({
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

    static virtualProperties = VNodeType.hasVirtualProperties({
        site: {
            type: VirtualPropType.OneRelationship,
            query: C`(@this)-[:${RelationshipType.rel.FOR_SITE}]->(@target)`,
            target: Site,
        },
        fromTypes: {
            type: VirtualPropType.ManyRelationship,
            query: C`(@this)-[:${RelationshipType.rel.FROM_ENTRY_TYPE}]->(@target)`,
            target: EntryType,
        },
        toTypes: {
            type: VirtualPropType.ManyRelationship,
            query: C`(@this)-[:${RelationshipType.rel.TO_ENTRY_TYPE}]->(@target)`,
            target: EntryType,
        },
    });

    static derivedProperties = VNodeType.hasDerivedProperties({
        // numRelatedImages,
    });

    static async validate(dbObject: RawVNode<typeof RelationshipType>, tx: WrappedTransaction): Promise<void> {
        await super.validate(dbObject, tx);

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
