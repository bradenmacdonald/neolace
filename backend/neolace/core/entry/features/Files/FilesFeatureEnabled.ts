import { C, RawVNode, VirtualPropType, VNodeType, WrappedTransaction } from "neolace/deps/vertex-framework.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { EnabledFeature } from "neolace/core/entry/features/EnabledFeature.ts";

/**
 * For each EntryType that supports (enables) the Files feature, that EntryType will have an
 * FilesFeatureEnabled (EnabledFeature) node with configuration that affects how the feature works.
 *
 * This is part of the site's schema, not content.
 */
export class FilesFeatureEnabled extends EnabledFeature {
    static label = "FilesFeatureEnabled";
    static properties = {
        ...VNodeType.properties,
        // TODO in future: min number of files allowed to be attached
        // TODO in future: max number of files allowed to be attached
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
