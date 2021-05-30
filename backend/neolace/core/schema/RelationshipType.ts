import {
    C,
    Field,
    VirtualPropType,
    VNodeType,
    VNodeTypeRef,
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
        /** The name of this RelationshipType */
        name: Field.String,
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
    });

    static derivedProperties = VNodeType.hasDerivedProperties({
        // numRelatedImages,
    });
}
