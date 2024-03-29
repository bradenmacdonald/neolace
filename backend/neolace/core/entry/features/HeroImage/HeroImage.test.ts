/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { SYSTEM_VNID, VNID } from "neolace/deps/vertex-framework.ts";
import { ImageSizingMode, PropertyType } from "neolace/deps/neolace-sdk.ts";

import { assertEquals, group, setTestIsolation, test } from "neolace/lib/tests.ts";
import { getGraph } from "neolace/core/graph.ts";
import { CreateSite } from "neolace/core/Site.ts";
import { ApplyEdits, UseSystemSource } from "neolace/core/edit/ApplyEdits.ts";
import { getCurrentSchema } from "neolace/core/schema/get-schema.ts";
import { CreateDataFile, DataFile } from "neolace/core/objstore/DataFile.ts";
import { getEntryFeatureData } from "../get-feature-data.ts";
import { AcceptDraft, CreateDraft, UpdateDraft } from "neolace/core/edit/Draft-actions.ts";
import { RecordTempFile } from "neolace/core/edit/TempFile-actions.ts";

group("HeroImage.ts", () => {
    setTestIsolation(setTestIsolation.levels.BLANK_ISOLATED);

    // Entry Type IDs:
    const entryTypeKey = "et-test", imageTypeKey = "et-img";
    // Relationship Type IDs:
    const hasFeatureImage = "prop-has-feature-img";

    test("Can be added to schema, shows up on schema, can be removed from schema", async () => {
        // Create a site and entry type:
        const graph = await getGraph();
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

        // Now enable the "HeroImage" Feature
        await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                {
                    code: "UpdateEntryTypeFeature",
                    data: {
                        entryTypeKey,
                        feature: {
                            featureType: "HeroImage",
                            enabled: true,
                            config: {
                                lookupExpression: "foobar",
                            },
                        },
                    },
                },
            ],
            editSource: UseSystemSource,
        }));
        // Now check the updated schema:
        const afterSchema = await graph.read((tx) => getCurrentSchema(tx, siteId));
        // The "HeroImage" feature should be enabled:
        assertEquals(afterSchema.entryTypes[entryTypeKey].enabledFeatures, {
            HeroImage: {
                lookupExpression: "foobar",
            },
        });

        // Now disable the "HeroImage" feature:
        await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                {
                    code: "UpdateEntryTypeFeature",
                    data: {
                        entryTypeKey,
                        feature: {
                            featureType: "HeroImage",
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

    test("Can be set on an entry and loaded using getEntryFeatureData()", async () => {
        const graph = await getGraph();
        const entryId = VNID(), imageId = VNID();
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
        // Create a site with a regular entry type and an image entry type:
        const { id: siteId } = await graph.runAsSystem(
            CreateSite({ name: "Site 1", domain: "test-site1.neolace.net", key: "test1" }),
        );
        const draft = await graph.runAsSystem(CreateDraft({
            title: "Hero Image Test Draft",
            description: "testing",
            siteId,
            authorId: SYSTEM_VNID,
            edits: [
                { code: "CreateEntryType", data: { key: entryTypeKey, name: "EntryType" } },
                { code: "CreateEntryType", data: { key: imageTypeKey, name: "ImageType" } },
                {
                    code: "UpdateEntryTypeFeature",
                    data: {
                        entryTypeKey,
                        feature: {
                            featureType: "HeroImage",
                            enabled: true,
                            config: { lookupExpression: `this.get(prop=prop("${hasFeatureImage}"))` },
                        },
                    },
                },
                {
                    code: "UpdateEntryTypeFeature",
                    data: {
                        entryTypeKey: imageTypeKey,
                        feature: {
                            featureType: "Image",
                            enabled: true,
                            config: {},
                        },
                    },
                },
                // Create a relationship that we'll use to speciify the hero image:
                {
                    code: "CreateProperty",
                    data: {
                        key: hasFeatureImage,
                        type: PropertyType.RelOther,
                        name: "has feature image",
                        appliesTo: [{ entryTypeKey }],
                    },
                },
                // Create an entry:
                {
                    code: "CreateEntry",
                    data: {
                        entryId,
                        entryTypeKey,
                        name: "Test WithImage",
                        key: "test",
                        description: "This is an entry",
                    },
                },
                // Create an image:
                {
                    code: "CreateEntry",
                    data: {
                        entryId: imageId,
                        entryTypeKey: imageTypeKey,
                        name: "Test Image",
                        key: "img",
                        description: "This is an image",
                    },
                },
            ],
        }));
        const { tempFileId } = await graph.runAsSystem(
            RecordTempFile({ userId: SYSTEM_VNID, dataFileId: dataFile.id }),
        );
        await graph.runAsSystem(UpdateDraft({
            id: draft.id,
            addEdits: [
                {
                    code: "UpdateEntryFeature",
                    data: {
                        entryId: imageId,
                        feature: {
                            featureType: "Image",
                            tempFileId,
                        },
                    },
                },
            ],
        }));
        await graph.runAsSystem(AcceptDraft({ id: draft.id }));

        // At first, even though the "HeroImage" feature is enabled for the entry type, it has no hero image:
        const before = await graph.read((tx) => getEntryFeatureData(entryId, { featureType: "HeroImage", tx }));
        assertEquals(before, undefined);

        // Now set the hero image:
        const caption = "This is the **caption**.";

        await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                {
                    code: "AddPropertyFact",
                    data: {
                        entryId: entryId,
                        propertyKey: hasFeatureImage,
                        propertyFactId: VNID(),
                        valueExpression: `entry("${imageId}")`,
                        note: caption,
                    },
                },
            ],
            editSource: UseSystemSource,
        }));

        ////////////////////////////////////////////////////////////////////////////
        // Now we should see the hero image on the entry:
        const after = await graph.read((tx) => getEntryFeatureData(entryId, { featureType: "HeroImage", tx }));
        assertEquals(after, {
            entryId: imageId,
            imageUrl: dataFileUrl,
            caption,
            sizing: ImageSizingMode.Contain,
            width: 100,
            height: 50,
            blurHash: "LEHV6nWB2yk8pyo0adR*.7kCMdnj",
            borderColor: undefined,
        });
    });
});
