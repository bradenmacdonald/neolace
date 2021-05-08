import Joi from "@hapi/joi";
import {
    SlugIdProperty,
    DerivedProperty,
    VirtualPropType,
    C,
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
        name: Joi.string().required(),
        // Description: Short, rich text summary of the entry type
        description: Joi.string().max(5_000),
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
