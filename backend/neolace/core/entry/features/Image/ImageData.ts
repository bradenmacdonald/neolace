import {
    C,
    DerivedProperty,
    VirtualPropType,
    VNodeType,
} from "neolace/deps/vertex-framework.ts";
import { config } from "neolace/app/config.ts";
import { EntryFeatureData } from "neolace/core/entry/features/EntryFeatureData.ts";
import { DataFile } from "neolace/core/objstore/DataFile.ts";


/**
 * If an EntryType has the Image Feature enabled, then its entries each have an image file attached to them, i.e. the
 * entry represents an image.
 */
export class ImageData extends EntryFeatureData {
    static label = "ImageData";
    static properties = {
        ...EntryFeatureData.properties,
    };

    static readonly rel = this.hasRelationshipsFromThisTo({
        HAS_DATA: {
            to: [DataFile],
            cardinality: VNodeType.Rel.ToOneRequired,
        },
    });

    static virtualProperties = this.hasVirtualProperties(() => ({
        dataFile: {
            type: VirtualPropType.OneRelationship,
            query: C`(@this)-[:${this.rel.HAS_DATA}]->(@target:${DataFile})`,
            target: DataFile,
        },
    }));

    static derivedProperties = this.hasDerivedProperties({
        imageUrl,
    });
}


/**
 * Get the full public path to view/download this image
 */
 export function imageUrl(): DerivedProperty<string> { return DerivedProperty.make(
    ImageData,
    img => img.dataFile(df => df.sha256Hash),
    data => {
        if (data.dataFile === null) { throw new Error(`Image is unexpectedly missing required DataFile.`); }
        return `${config.objStorePublicUrlPrefix}/${data.dataFile.sha256Hash}`;
    },
);}
