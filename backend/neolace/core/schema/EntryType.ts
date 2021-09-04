import * as check from "neolace/deps/computed-types.ts";
import { ContentType } from "neolace/deps/neolace-api.ts";
import {
    C,
    Field,
    VirtualPropType,
    VNodeType,
} from "neolace/deps/vertex-framework.ts";
import { Site } from "neolace/core/Site.ts";

import { ComputedFact } from "neolace/core/entry/ComputedFact.ts";

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
        description: Field.NullOr.String.Check(check.string.trim().max(5_000)),
        /** FriendlyId prefix for entries of this type; if NULL then FriendlyIds are not used. */
        friendlyIdPrefix: Field.NullOr.Slug.Check(check.string.regexp(/.*-$/)),  // Must end in a hyphen
        contentType: Field.String.Check(check.Schema.enum(ContentType)),
    };

    static readonly rel = VNodeType.hasRelationshipsFromThisTo({
        /** Which Site this entry type is part of */
        FOR_SITE: {
            to: [Site],
            cardinality: VNodeType.Rel.ToOneRequired,
        },
        /** Computed facts to display on entries of this type */
        HAS_COMPUTED_FACT: {
            to: [ComputedFact],
            cardinality: VNodeType.Rel.ToManyUnique,
        },
    });

    static virtualProperties = VNodeType.hasVirtualProperties({
        site: {
            type: VirtualPropType.OneRelationship,
            query: C`(@this)-[:${this.rel.FOR_SITE}]->(@target)`,
            target: Site,
        },
        computedFacts: {
            type: VirtualPropType.ManyRelationship,
            query: C`(@this)-[:HAS_COMPUTED_FACT]->(@target)`,
            target: ComputedFact,
        },
    });

    static derivedProperties = VNodeType.hasDerivedProperties({
        // numRelatedImages,
    });
}
