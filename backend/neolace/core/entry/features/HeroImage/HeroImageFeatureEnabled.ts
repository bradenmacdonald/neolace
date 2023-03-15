/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { C, Field, VirtualPropType, VNodeType } from "neolace/deps/vertex-framework.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { EnabledFeature } from "neolace/core/entry/features/EnabledFeature.ts";

/**
 * For each EntryType that supports (enables) the Hero Image feature, that EntryType will have an
 * HeroImageFeatureEnabled (EnabledFeature) node with configuration that affects how the feature works.
 *
 * This is part of the site's schema, not content.
 */
export class HeroImageFeatureEnabled extends EnabledFeature {
    static label = "HeroImageFeatureEnabled";
    static properties = {
        ...VNodeType.properties,
        /** This lookup expression determines which image entry is used as the "hero image" for this entry type. */
        lookupExpression: Field.String,
    };

    static readonly rel = this.hasRelationshipsFromThisTo({});

    static virtualProperties = this.hasVirtualProperties(() => ({
        entryType: {
            type: VirtualPropType.OneRelationship,
            query: C`(@this)<-[:${EntryType.rel.HAS_FEATURE}]-(@target:${EntryType})`,
            target: EntryType,
        },
    }));

    static derivedProperties = this.hasDerivedProperties({});

    static async validate(): Promise<void> {
        // No specific validation
    }
}
