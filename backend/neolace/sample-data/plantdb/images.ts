import { SYSTEM_VNID, VNID } from "neolace/deps/vertex-framework.ts";
import { schema } from "./schema.ts";
import { files } from "./datafiles.ts";

import { AcceptDraft, AddFileToDraft, CreateDraft, UpdateDraft } from "neolace/core/edit/Draft-actions.ts";
import { getGraph } from "neolace/core/graph.ts";
import { entryData } from "./content.ts";
import { ImageSizingMode } from "neolace/deps/neolace-api.ts";

export async function createImages(siteId: VNID) {
    const graph = await getGraph();
    const draft = await graph.runAsSystem(CreateDraft({
        title: "Hero Image Upload Draft",
        description: "Uploading images for PlantDB sample content.",
        siteId,
        authorId: SYSTEM_VNID,
        edits: [],
    }));
    const { id: draftFileId } = await graph.runAsSystem(
        AddFileToDraft({ draftId: draft.id, dataFileId: files.ponderosaPineImg.id }),
    );
    await graph.runAsSystem(UpdateDraft({
        id: draft.id,
        addEdits: [
            {
                code: "CreateEntry",
                data: {
                    entryId: entryData.imgPonderosaTrunk.id,
                    ...entryData.imgPonderosaTrunk,
                    entryTypeKey: schema.entryTypes.ETIMAGE.key,
                    description: (entryData.imgPonderosaTrunk.description = `
                    A [ponderosa pine](/entry/${entryData.ponderosaPine.key}) at Butte Lake, Lassen Volcanic National Park, California 40°33'48"N 121°17'37"W, 1850m altitude.
                    Photo by [Vlad & Marina Butsky](https://www.flickr.com/photos/butsky/), [published on Flickr](https://www.flickr.com/photos/butsky/1183753142/) under the
                    [Creative Commons Attribution 2.0 Generic (CC BY 2.0)](https://creativecommons.org/licenses/by/2.0/) license.
                `.trim()),
                },
            },
            {
                code: "UpdateEntryFeature",
                data: {
                    entryId: entryData.imgPonderosaTrunk.id,
                    feature: { featureType: "Image", draftFileId, setSizing: ImageSizingMode.Cover },
                },
            },
            // This image relates to the ponderosa pine:
            {
                code: "AddPropertyFact",
                data: {
                    entryId: entryData.imgPonderosaTrunk.id,
                    propertyKey: schema.properties.imgRelTo.key,
                    valueExpression: `entry("${entryData.ponderosaPine.id}")`,
                    propertyFactId: VNID(),
                },
            },
            // This image is used as the hero image for the ponderosa pine
            {
                code: "AddPropertyFact",
                data: {
                    entryId: entryData.ponderosaPine.id,
                    propertyKey: schema.properties.hasHeroImage.key,
                    valueExpression: `entry("${entryData.imgPonderosaTrunk.id}")`,
                    propertyFactId: VNID(),
                    note: "a ponderosa pine trunk in Lassen Volcanic National Park",
                },
            },
        ],
    }));
    await graph.runAsSystem(AcceptDraft({ id: draft.id }));
}
