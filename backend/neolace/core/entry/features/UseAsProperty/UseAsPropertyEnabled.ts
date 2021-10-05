import {
    C,
    RawVNode,
    ValidationError,
    VNodeType,
    VirtualPropType,
    WrappedTransaction,
} from "neolace/deps/vertex-framework.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { EnabledFeature } from "neolace/core/entry/features/EnabledFeature.ts";

/**
 * For each EntryType that supports (enables) the property feature, that EntryType will have an
 * UseAsPropertyEnabled (EnabledFeature) node with configuration that affects how the feature works.
 * 
 * This is part of the site's schema, not content.
 */
 export class UseAsPropertyEnabled extends EnabledFeature {
    static label = "UseAsPropertyEnabled";
    static properties = {
        ...VNodeType.properties,
    };

    static readonly rel = this.hasRelationshipsFromThisTo({
        APPLIES_TO: {
            to: [EntryType],
            cardinality: VNodeType.Rel.ToManyUnique,
        },
    });

    static virtualProperties = this.hasVirtualProperties(() => ({
        appliesTo: {
            type: VirtualPropType.ManyRelationship,
            query: C`(@this)-[:${this.rel.APPLIES_TO}]->(@target:${EntryType})`,
            target: EntryType,
        },
        entryType: {
            type: VirtualPropType.OneRelationship,
            query: C`(@this)<-[:${EntryType.rel.HAS_FEATURE}]-(@target:${EntryType})`,
            target: EntryType,
        },
    }));

    static derivedProperties = this.hasDerivedProperties({});

    static async validate(dbObject: RawVNode<typeof this>, tx: WrappedTransaction): Promise<void> {
        // Validate the the applicable entry types are from the same site:
        const data = await tx.pullOne(UseAsPropertyEnabled, pe => pe.entryType(et => et.site(s => s.id)).appliesTo(et => et.site(s => s.id)), {key: dbObject.id});

        const siteId = data.entryType?.site?.id;
        if (!siteId) { throw new Error("Couldn't load siteId"); }  // This is just for TypeScript, until Vertex can mark these as non-nullable

        data.appliesTo?.forEach(entryType => {
            if (entryType.site?.id !== siteId) {
                throw new ValidationError("UseAsPropertyEnabled APPLIES_TO cannot point to entry types from a different site.");
            }
        });
    }
}
