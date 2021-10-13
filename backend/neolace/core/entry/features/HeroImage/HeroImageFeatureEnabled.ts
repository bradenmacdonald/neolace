import {
    C,
    RawVNode,
    VNodeType,
    VirtualPropType,
    WrappedTransaction,
} from "neolace/deps/vertex-framework.ts";
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
        // Future: add a default image as well as a lookup expression for computing the hero image.
    };

    static readonly rel = this.hasRelationshipsFromThisTo({
    });

    static virtualProperties = this.hasVirtualProperties(() => ({
        entryType: {
            type: VirtualPropType.OneRelationship,
            query: C`(@this)<-[:${EntryType.rel.HAS_FEATURE}]-(@target:${EntryType})`,
            target: EntryType,
        },
    }));

    static derivedProperties = this.hasDerivedProperties({});

    static async validate(_dbObject: RawVNode<typeof this>, _tx: WrappedTransaction): Promise<void> {
        // No specific validation
    }
}
