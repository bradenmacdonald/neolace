import {
    C,
    Field,
    VirtualPropType,
    VNodeType,
    VNodeTypeRef,
} from "vertex-framework";
import { Site } from "../Site";
import { ContentType } from "neolace-api";


/**
 * Schema definition for a type of entry
 */
@VNodeType.declare
export class EntryType extends VNodeType {
    static label = "EntryType";
    static properties = {
        ...VNodeType.properties,
        /** The name of this entry type */
        name: Field.String,
        /** Description: Short, rich text summary of the entry type  */
        description: Field.NullOr.String.Check(desc => desc.max(5_000)),
        /** FriendlyId prefix for entries of this type; if NULL then FriendlyIds are not used. */
        friendlyIdPrefix: Field.NullOr.Slug.Check(s => s.regex(/.*-$/)),  // Must end in a hyphen
        contentType: Field.String.Check(c => c.valid(
            ContentType.None,
            ContentType.Article,
        )),
    };

    static readonly rel = VNodeType.hasRelationshipsFromThisTo({
        /** Which Site this entry type is part of */
        FOR_SITE: {
            to: [Site],
            cardinality: VNodeType.Rel.ToOneRequired,
        },
    });

    static virtualProperties = VNodeType.hasVirtualProperties({
        site: {
            type: VirtualPropType.OneRelationship,
            query: C`(@this)-[:${EntryType.rel.FOR_SITE}]->(@target)`,
            target: Site,
        },
    });

    static derivedProperties = VNodeType.hasDerivedProperties({
        // numRelatedImages,
    });
}
