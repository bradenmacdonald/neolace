import { C, RawVNode, VirtualPropType, VNodeType, WrappedTransaction } from "neolace/deps/vertex-framework.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { EnabledFeature } from "neolace/core/entry/features/EnabledFeature.ts";

/**
 * For each EntryType that supports (enables) the Image feature, that EntryType will have an
 * ImageFeatureEnabled (EnabledFeature) node with configuration that affects how the feature works.
 *
 * This is part of the site's schema, not content.
 */
export class ImageFeatureEnabled extends EnabledFeature {
    static label = "ImageFeatureEnabled";
    static properties = {
        ...VNodeType.properties,
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

    static async validate(_dbObject: RawVNode<typeof this>, _tx: WrappedTransaction): Promise<void> {
        // No specific validation
    }
}
