import {
    Field,
    VNodeType,
    VNodeTypeRef,
} from "vertex-framework";
import { Site } from "../Site";


/**
 * Schema definition for a type of entry
 */
@VNodeType.declare
export class EntryType extends VNodeType {
    static label = "EntryType";
    static properties = {
        ...VNodeType.properties,
        // The name of this entry type
        name: Field.String,
        // Description: Short, rich text summary of the entry type
        description: Field.NullOr.String.Check(desc => desc.max(5_000)),
    };

    static readonly rel = VNodeType.hasRelationshipsFromThisTo({
        /** Which Site this entry type is part of */
        FOR_SITE: {
            to: [Site],
            cardinality: VNodeType.Rel.ToOneRequired,
        },
    });

    static virtualProperties = VNodeType.hasVirtualProperties({
        // relatedImages: {
        //     type: VirtualPropType.ManyRelationship,
        //     query: C`(@target:${Image})-[:${Image.rel.RELATES_TO}]->(:${Entry})-[:IS_A*0..10]->(@this)`,
        //     target: Image,
        // },
    });

    static derivedProperties = VNodeType.hasDerivedProperties({
        // numRelatedImages,
    });
}
