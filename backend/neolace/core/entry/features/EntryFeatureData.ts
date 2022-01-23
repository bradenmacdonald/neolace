import {
    VNodeType,
    RawVNode,
    WrappedTransaction,
} from "neolace/deps/vertex-framework.ts";


/**
 * Abstract base class for data stored on each Entry related to an "entry feature", which adds capabilities to an
 * EntryType.
 *
 * For example, if entries of EntryType A contain an image, we say that EntryType A has the "Image" feature enabled,
 * and entries of type A have image EntryFeatureData.
 *
 * For each EntryType, a given feature is either enabled or disabled. An entry cannot have e.g. two image features.
 */
export class EntryFeatureData extends VNodeType {
    static label = "EntryFeatureData";
    static properties = {...VNodeType.properties};

    static readonly rel = this.hasRelationshipsFromThisTo({});

    static virtualProperties = this.hasVirtualProperties(() => ({}));

    static derivedProperties = this.hasDerivedProperties({});

    static async validate(dbObject: RawVNode<typeof this>, _tx: WrappedTransaction): Promise<void> {
        if (dbObject._labels.length !== 3) {
            throw new Error(`Every EntryFeatureData VNode should have exactly three labels: VNode, EntryFeature, and _______Feature (a specific feature type)`);
        }
    }
}
