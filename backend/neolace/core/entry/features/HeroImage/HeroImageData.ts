import {
    C,
    Field,
    VirtualPropType,
    VNodeType,
} from "neolace/deps/vertex-framework.ts";
import { EntryFeatureData } from "neolace/core/entry/features/EntryFeatureData.ts";
import { Entry } from "neolace/core/entry/Entry.ts";


/**
 * If an EntryType has the Hero Image Feature enabled, then this specifies which image is used as the hero image for
 * each entry.
 */
export class HeroImageData extends EntryFeatureData {
    static label = "HeroImageData";
    static properties = {
        ...EntryFeatureData.properties,
        /** The markdown caption to display next to the hero image. */
        caption: Field.NullOr.String,
    };

    static readonly rel = this.hasRelationshipsFromThisTo({
        HAS_HERO_IMAGE: {
            to: [Entry],
            cardinality: VNodeType.Rel.ToOneRequired,
        },
    });

    static virtualProperties = this.hasVirtualProperties(() => ({
        heroImageEntry: {
            type: VirtualPropType.OneRelationship,
            query: C`(@this)-[:${this.rel.HAS_HERO_IMAGE}]->(@target:${Entry})`,
            target: Entry,
        },
    }));

}
