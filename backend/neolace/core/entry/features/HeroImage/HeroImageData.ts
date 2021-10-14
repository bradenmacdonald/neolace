import { EntryFeatureData } from "neolace/core/entry/features/EntryFeatureData.ts";


/**
 * This class is not really used, but we have to define it for consistency with how other "Entry Features" work.
 */
export class HeroImageData extends EntryFeatureData {
    static label = "HeroImageData";
    static properties = {
        ...EntryFeatureData.properties,
    };

    static readonly rel = this.hasRelationshipsFromThisTo({});

    static virtualProperties = this.hasVirtualProperties(() => ({}));

}
