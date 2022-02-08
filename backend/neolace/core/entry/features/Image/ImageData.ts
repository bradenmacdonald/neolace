import * as check from "neolace/deps/computed-types.ts";
import { C, Field, VirtualPropType, VNodeType } from "neolace/deps/vertex-framework.ts";
import { ImageSizingMode } from "neolace/deps/neolace-api.ts";
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
        sizing: Field.String.Check(check.Schema.enum(ImageSizingMode)),
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
}
