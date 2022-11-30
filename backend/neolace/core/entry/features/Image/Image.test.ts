import { SYSTEM_VNID, VNID } from "neolace/deps/vertex-framework.ts";
import { ImageSizingMode } from "neolace/deps/neolace-api.ts";

import { assertEquals, group, setTestIsolation, test } from "neolace/lib/tests.ts";
import { getGraph } from "neolace/core/graph.ts";
import { CreateSite } from "neolace/core/Site.ts";
import { ApplyEdits, UseSystemSource } from "neolace/core/edit/ApplyEdits.ts";
import { getCurrentSchema } from "neolace/core/schema/get-schema.ts";
import { CreateDataFile, DataFile } from "neolace/core/objstore/DataFile.ts";
import { getEntryFeaturesData } from "../get-feature-data.ts";
import { AcceptDraft, AddFileToDraft, CreateDraft, UpdateDraft } from "neolace/core/edit/Draft-actions.ts";

group("Image.ts", () => {
    setTestIsolation(setTestIsolation.levels.BLANK_ISOLATED);

    // Entry Type ID:
    const entryTypeKey = "T1";

    test("Can be added to schema, shows up on schema, can be removed from schema", async () => {
        const graph = await getGraph();
        // Create a site and entry type:
        const { id: siteId } = await graph.runAsSystem(
            CreateSite({ name: "Site 1", domain: "test-site1.neolace.net", key: "test1" }),
        );
        await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                { code: "CreateEntryType", data: { key: entryTypeKey, name: "EntryType" } },
            ],
            editSource: UseSystemSource,
        }));

        // Now get the schema, without the "Image" feature enabled yet:
        const beforeSchema = await graph.read((tx) => getCurrentSchema(tx, siteId));
        // No features should be enabled:
        assertEquals(beforeSchema.entryTypes[entryTypeKey].enabledFeatures, {});

        // Now enable the "Image" Feature
        await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                {
                    code: "UpdateEntryTypeFeature",
                    data: {
                        entryTypeKey: entryTypeKey,
                        feature: {
                            featureType: "Image",
                            enabled: true,
                            config: {},
                        },
                    },
                },
            ],
            editSource: UseSystemSource,
        }));
        // Now check the updated schema:
        const afterSchema = await graph.read((tx) => getCurrentSchema(tx, siteId));
        // The "Image" feature should be enabled:
        assertEquals(afterSchema.entryTypes[entryTypeKey].enabledFeatures, {
            Image: {},
        });

        // Now disable the "Image" feature:
        await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                {
                    code: "UpdateEntryTypeFeature",
                    data: {
                        entryTypeKey,
                        feature: {
                            featureType: "Image",
                            enabled: false,
                        },
                    },
                },
            ],
            editSource: UseSystemSource,
        }));
        // The schema should return to the initial version:
        assertEquals(
            await graph.read((tx) => getCurrentSchema(tx, siteId)),
            beforeSchema,
        );
    });

    test("Can be set on an entry and loaded using getEntryFeaturesData()", async () => {
        const graph = await getGraph();
        const entryId = VNID();
        // Create a site with an image entry type:
        const { id: siteId } = await graph.runAsSystem(
            CreateSite({ name: "Site 1", domain: "test-site1.neolace.net", key: "test1" }),
        );
        await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                { code: "CreateEntryType", data: { key: entryTypeKey, name: "ImageType" } },
                {
                    code: "UpdateEntryTypeFeature",
                    data: {
                        entryTypeKey,
                        feature: {
                            featureType: "Image",
                            enabled: true,
                            config: {},
                        },
                    },
                },
                // Create an entry:
                {
                    code: "CreateEntry",
                    data: {
                        entryId,
                        entryTypeKey,
                        name: "Test Image",
                        key: "img-test",
                        description: "An Image for Testing",
                    },
                },
            ],
            editSource: UseSystemSource,
        }));

        // At first, even though the "Image" feature is enabled for this entry type, it has no image data:
        const before = await graph.read((tx) => getEntryFeaturesData(entryId, { tx }));
        assertEquals(before.Image, undefined);

        ////////////////////////////////////////////////////////////////////////////
        // Create a data file, as if we uploaded a file:
        const dataFile = {
            id: VNID(),
            sha256Hash: "e0b56bc58b5b4ac8b6f9a3e0fc5083d4c7f447738ef39241377687d6bfcef0e6",
            filename: "image.webp",
            contentType: "image/webp",
            size: 10_000,
            metadata: { type: "image", width: 100, height: 50, blurHash: "LEHV6nWB2yk8pyo0adR*.7kCMdnj" },
        };
        await graph.runAsSystem(CreateDataFile(dataFile));
        const dataFileUrl = (await graph.pullOne(DataFile, (df) => df.publicUrl(), { key: dataFile.id })).publicUrl;

        // Now set the data file as this entry's image data:
        const draft = await graph.runAsSystem(CreateDraft({
            title: "Hero Image Test Draft",
            description: "testing",
            siteId,
            authorId: SYSTEM_VNID,
            edits: [],
        }));
        const { id: draftFileId } = await graph.runAsSystem(
            AddFileToDraft({ draftId: draft.id, dataFileId: dataFile.id }),
        );
        await graph.runAsSystem(UpdateDraft({
            id: draft.id,
            addEdits: [
                {
                    code: "UpdateEntryFeature",
                    data: {
                        entryId,
                        feature: {
                            featureType: "Image",
                            draftFileId,
                        },
                    },
                },
            ],
        }));
        await graph.runAsSystem(AcceptDraft({ id: draft.id }));

        ////////////////////////////////////////////////////////////////////////////
        // Now we should see the image on the entry:
        const after = await graph.read((tx) => getEntryFeaturesData(entryId, { tx }));
        assertEquals(after.Image, {
            imageUrl: dataFileUrl,
            contentType: dataFile.contentType,
            size: dataFile.size,
            sizing: ImageSizingMode.Contain,
            width: 100,
            height: 50,
            blurHash: "LEHV6nWB2yk8pyo0adR*.7kCMdnj",
            borderColor: undefined,
        });
    });
});
