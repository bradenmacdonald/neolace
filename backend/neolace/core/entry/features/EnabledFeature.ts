import {
    VNodeType,
    RawVNode,
    WrappedTransaction,
} from "neolace/deps/vertex-framework.ts";


/**
 * For each EntryType that supports (enables) a given feature (like Article text), that EntryType will have an
 * EnabledFeature node with configuration that affects how the feature works.
 *
 * This is an abstract class.
 */
export class EnabledFeature extends VNodeType {
    static label = "EnabledFeature";
    static properties = {
        ...VNodeType.properties,
    };

    static readonly rel = this.hasRelationshipsFromThisTo({});

    static virtualProperties = this.hasVirtualProperties(() => ({}));

    static derivedProperties = this.hasDerivedProperties({});

    // deno-lint-ignore require-await
    static async validate(dbObject: RawVNode<typeof this>, _tx: WrappedTransaction): Promise<void> {        
        if (dbObject._labels.length !== 3) {
            throw new Error(`Every EnabledFeature VNode should have exactly three labels: VNode, EnabledFeature, and _________Enabled (a specific feature type)`);
        }
    }
}
