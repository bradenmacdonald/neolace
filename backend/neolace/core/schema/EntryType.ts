import * as check from "neolace/deps/computed-types.ts";
import * as api from "neolace/deps/neolace-api.ts";
import { C, Field, VirtualPropType, VNodeType } from "neolace/deps/vertex-framework.ts";
import { Site } from "neolace/core/Site.ts";

import { EnabledFeature } from "neolace/core/entry/features/EnabledFeature.ts";

/**
 * Schema definition for a type of entry
 */
export class EntryType extends VNodeType {
    static label = "EntryType";
    static properties = {
        ...VNodeType.properties,
        /** The name of this entry type */
        name: Field.String,
        /** Description: Short, rich text summary of the entry type  */
        description: Field.NullOr.String.Check(check.string.trim().max(5_000)),
        /** FriendlyId prefix for entries of this type. Can be an empty string */
        friendlyIdPrefix: Field.NullOr.Slug,
        /** Color to represent this entry type */
        color: Field.String.Check(check.Schema.enum(api.EntryTypeColor)),
        /** One or two letters used to represent this entry as an abbreviation */
        abbreviation: Field.String.Check(check.string.min(0).max(2)),
    };

    static readonly rel = this.hasRelationshipsFromThisTo({
        /** Which Site this entry type is part of */
        FOR_SITE: {
            to: [Site],
            cardinality: VNodeType.Rel.ToOneRequired,
        },
        HAS_FEATURE: {
            to: [EnabledFeature],
            cardinality: VNodeType.Rel.ToManyUnique,
        },
    });

    static virtualProperties = this.hasVirtualProperties({
        site: {
            type: VirtualPropType.OneRelationship,
            query: C`(@this)-[:${this.rel.FOR_SITE}]->(@target)`,
            target: Site,
        },
    });

    static derivedProperties = this.hasDerivedProperties({
        // numRelatedImages,
    });
}
