import { VNID } from "neolace/deps/vertex-framework.ts";

import { assertEquals, group, setTestIsolation, test } from "neolace/lib/tests.ts";
import { graph } from "neolace/core/graph.ts";
import { CreateSite } from "neolace/core/Site.ts";
import { ApplyEdits } from "neolace/core/edit/ApplyEdits.ts";
import { getCurrentSchema } from "neolace/core/schema/get-schema.ts";
import { CreateDataFile, DataFile } from "neolace/core/objstore/DataFile.ts";
import { getEntryFeaturesData } from "../get-feature-data.ts";

group(import.meta, () => {
    setTestIsolation(setTestIsolation.levels.BLANK_ISOLATED);

    // Entry Type ID:
    const entryType = VNID();

    test("Can be added to schema, shows up on schema, can be removed from schema", async () => {
        // Create a site and entry type:
        const { id: siteId } = await graph.runAsSystem(
            CreateSite({ name: "Site 1", domain: "test-site1.neolace.net", slugId: "site-test1" }),
        );
        await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                { code: "CreateEntryType", data: { id: entryType, name: "EntryType" } },
            ],
        }));

        // Now get the schema, without the "Image" feature enabled yet:
        const beforeSchema = await graph.read((tx) => getCurrentSchema(tx, siteId));
        // No features should be enabled:
        assertEquals(beforeSchema.entryTypes[entryType].enabledFeatures, {});

        // Now enable the "Image" Feature
        await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                {
                    code: "UpdateEntryTypeFeature",
                    data: {
                        entryTypeId: entryType,
                        feature: {
                            featureType: "Image",
                            enabled: true,
                            config: {},
                        },
                    },
                },
            ],
        }));
        // Now check the updated schema:
        const afterSchema = await graph.read((tx) => getCurrentSchema(tx, siteId));
        // The "Image" feature should be enabled:
        assertEquals(afterSchema.entryTypes[entryType].enabledFeatures, {
            Image: {},
        });

        // Now disable the "Image" feature:
        await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                {
                    code: "UpdateEntryTypeFeature",
                    data: {
                        entryTypeId: entryType,
                        feature: {
                            featureType: "Image",
                            enabled: false,
                        },
                    },
                },
            ],
        }));
        // The schema should return to the initial version:
        assertEquals(
            await graph.read((tx) => getCurrentSchema(tx, siteId)),
            beforeSchema,
        );
    });

    test("Can be set on an entry and loaded using getEntryFeaturesData()", async () => {
        const entryId = VNID();
        // Create a site with an image entry type:
        const { id: siteId } = await graph.runAsSystem(
            CreateSite({ name: "Site 1", domain: "test-site1.neolace.net", slugId: "site-test1" }),
        );
        await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                { code: "CreateEntryType", data: { id: entryType, name: "ImageType" } },
                {
                    code: "UpdateEntryTypeFeature",
                    data: {
                        entryTypeId: entryType,
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
                        id: entryId,
                        type: entryType,
                        name: "Test Image",
                        friendlyId: "img-test",
                        description: "An Image for Testing",
                    },
                },
            ],
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
        await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                {
                    code: "UpdateEntryFeature",
                    data: {
                        entryId,
                        feature: {
                            featureType: "Image",
                            dataFileId: dataFile.id,
                        },
                    },
                },
            ],
        }));

        ////////////////////////////////////////////////////////////////////////////
        // Now we should see the image on the entry:
        const after = await graph.read((tx) => getEntryFeaturesData(entryId, { tx }));
        assertEquals(after.Image, {
            imageUrl: dataFileUrl,
            contentType: dataFile.contentType,
            size: dataFile.size,
            width: 100,
            height: 50,
            blurHash: "LEHV6nWB2yk8pyo0adR*.7kCMdnj",
        });
    });
});
