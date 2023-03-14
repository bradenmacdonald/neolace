/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import * as check from "neolace/deps/computed-types.ts";
import * as api from "neolace/deps/neolace-sdk.ts";
import {
    C,
    Field,
    RawRelationships,
    RawVNode,
    validateValue,
    VirtualPropType,
    VNodeType,
} from "neolace/deps/vertex-framework.ts";
import { Site } from "neolace/core/Site.ts";

import { EnabledFeature } from "neolace/core/entry/features/EnabledFeature.ts";
import { keyProps, validateSiteNamespace } from "../key.ts";

/**
 * Schema definition for a type of entry
 */
export class EntryType extends VNodeType {
    static label = "EntryType";
    static properties = {
        ...VNodeType.properties,
        ...keyProps,
        /** The name of this entry type */
        name: Field.String,
        /** Description: Short, rich text summary of the entry type  */
        description: Field.String.Check(check.string.trim().max(5_000)),
        /** Key prefix for entries of this type. */
        keyPrefix: Field.String.Check((value) => {
            // This is really a Field.Slug but Field.Slug doesn't allow empty strings, so we have to do this to
            // enforce slug validation but also allow empty strings:
            return value === "" ? "" : validateValue(Field.Slug, value);
        }),
        /** Color to represent this entry type */
        color: Field.String.Check(check.Schema.enum(api.EntryTypeColor)),
        colorCustom: Field.NullOr.String.Check((v) => {
            if (typeof v === "string" && v.match(/^[0-9A-F]{18}$/)) return v;
            throw new Error("Invalid custom color");
        }),
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

    static async validate(dbObject: RawVNode<typeof this>, relationships: RawRelationships[]): Promise<void> {
        // Validate that siteNamespace is correct.
        validateSiteNamespace(this, dbObject, relationships, this.rel.FOR_SITE);
    }
}
