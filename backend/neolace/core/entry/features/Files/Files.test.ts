import { SYSTEM_VNID, VNID } from "neolace/deps/vertex-framework.ts";

import { assertEquals, group, setTestIsolation, test } from "neolace/lib/tests.ts";
import { getGraph } from "neolace/core/graph.ts";
import { CreateSite } from "neolace/core/Site.ts";
import { ApplyEdits, UseSystemSource } from "neolace/core/edit/ApplyEdits.ts";
import { getCurrentSchema } from "neolace/core/schema/get-schema.ts";
import { CreateDataFile, DataFile } from "neolace/core/objstore/DataFile.ts";
import { getEntryFeaturesData } from "../get-feature-data.ts";
import { AcceptDraft, AddFileToDraft, CreateDraft, UpdateDraft } from "neolace/core/edit/Draft-actions.ts";

group("Files.ts", () => {
    setTestIsolation(setTestIsolation.levels.BLANK_ISOLATED);

    // Entry Type ID:
    const entryType = VNID();

    test("Can be added to schema, shows up on schema, can be removed from schema", async () => {
        const graph = await getGraph();
        // Create a site and entry type:
        const { id: siteId } = await graph.runAsSystem(
            CreateSite({ name: "Site 1", domain: "test-site1.neolace.net", friendlyId: "test1" }),
        );
        await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                { code: "CreateEntryType", data: { id: entryType, name: "EntryType" } },
            ],
            editSource: UseSystemSource,
        }));

        // Now get the schema, without the "Files" feature enabled yet:
        const beforeSchema = await graph.read((tx) => getCurrentSchema(tx, siteId));
        // No features should be enabled:
        assertEquals(beforeSchema.entryTypes[entryType].enabledFeatures, {});

        // Now enable the "Files" Feature
        await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                {
                    code: "UpdateEntryTypeFeature",
                    data: {
                        entryTypeId: entryType,
                        feature: {
                            featureType: "Files",
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
        // The "Files" feature should be enabled:
        assertEquals(afterSchema.entryTypes[entryType].enabledFeatures, {
            Files: {},
        });

        // Now disable the "Files" feature:
        await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                {
                    code: "UpdateEntryTypeFeature",
                    data: {
                        entryTypeId: entryType,
                        feature: {
                            featureType: "Files",
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
            CreateSite({ name: "Site 1", domain: "test-site1.neolace.net", friendlyId: "test1" }),
        );
        await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                { code: "CreateEntryType", data: { id: entryType, name: "EntryTypeWithFiles" } },
                {
                    code: "UpdateEntryTypeFeature",
                    data: {
                        entryTypeId: entryType,
                        feature: {
                            featureType: "Files",
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
                        type: entryType,
                        name: "Test With Files",
                        friendlyId: "files-test",
                        description: "An Entry with Files, for Testing",
                    },
                },
            ],
            editSource: UseSystemSource,
        }));

        // At first, even though the "Files" feature is enabled for this entry type, it has no image data:
        const before = await graph.read((tx) => getEntryFeaturesData(entryId, { tx }));
        assertEquals(before.Files, undefined);

        ////////////////////////////////////////////////////////////////////////////
        // Create a data file, as if we uploaded a file:
        const uploadPdf = async (args: { size: number; filename: string }) => {
            const dataFile = {
                id: VNID(),
                sha256Hash: "e0b56bc58b5b4ac8b6f9a3e0fc5083d4c7f447738ef39241377687d6bfcef0e6",
                filename: "random-filename-on-obj-store.pdf", // This filename is the filename on object storage, usually a UUID
                contentType: "application/pdf",
                size: args.size,
                metadata: {},
            };
            await graph.runAsSystem(CreateDataFile(dataFile));
            const url = (await graph.pullOne(DataFile, (df) => df.publicUrl(), { key: dataFile.id })).publicUrl;

            // Now set the data file as this entry's attached file:
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
                key: draft.id,
                addEdits: [
                    {
                        code: "UpdateEntryFeature",
                        data: {
                            entryId,
                            feature: {
                                featureType: "Files",
                                changeType: "addFile",
                                filename: args.filename,
                                draftFileId,
                            },
                        },
                    },
                ],
            }));
            await graph.runAsSystem(AcceptDraft({ id: draft.id }));
            return { url, ...args };
        };

        const firstPdf = await uploadPdf({ size: 123_000, filename: "manual.pdf" });

        ////////////////////////////////////////////////////////////////////////////
        // Now we should see the file on the entry:
        const after = await graph.read((tx) => getEntryFeaturesData(entryId, { tx }));
        assertEquals(after.Files, {
            files: [
                {
                    filename: firstPdf.filename,
                    url: firstPdf.url,
                    contentType: "application/pdf",
                    size: firstPdf.size,
                },
            ],
        });

        ////////////////////////////////////////////////////////////////////////////
        // Create a DIFFERENT data file, as if we uploaded another file:
        const secondPdf = await uploadPdf({ size: 456_000, filename: "second.pdf" });
        // Now we should see two files on the entry:
        const after2 = await graph.read((tx) => getEntryFeaturesData(entryId, { tx }));
        assertEquals(after2.Files, {
            files: [
                {
                    filename: firstPdf.filename,
                    url: firstPdf.url,
                    contentType: "application/pdf",
                    size: firstPdf.size,
                },
                {
                    filename: secondPdf.filename,
                    url: secondPdf.url,
                    contentType: "application/pdf",
                    size: secondPdf.size,
                },
            ],
        });

        ////////////////////////////////////////////////////////////////////////////
        // Now overwrite "manual.pdf" with a new version
        const thirdPdf = await uploadPdf({ size: 333_000, filename: "manual.pdf" });
        // Now we should see two files on the entry:
        const after3 = await graph.read((tx) => getEntryFeaturesData(entryId, { tx }));
        assertEquals(after3.Files, {
            files: [
                {
                    // manual.pdf has changed to this third file:
                    filename: thirdPdf.filename,
                    url: thirdPdf.url,
                    contentType: "application/pdf",
                    size: thirdPdf.size,
                },
                {
                    // second.pdf is unchanged:
                    filename: secondPdf.filename,
                    url: secondPdf.url,
                    contentType: "application/pdf",
                    size: secondPdf.size,
                },
            ],
        });

        ////////////////////////////////////////////////////////////////////////////
        // Now delete "second.pdf"
        await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                {
                    code: "UpdateEntryFeature",
                    data: {
                        entryId,
                        feature: {
                            featureType: "Files",
                            changeType: "removeFile",
                            filename: "second.pdf",
                        },
                    },
                },
            ],
            editSource: UseSystemSource,
        }));
        const after4 = await graph.read((tx) => getEntryFeaturesData(entryId, { tx }));
        assertEquals(after4.Files, {
            files: [
                {
                    filename: thirdPdf.filename,
                    url: thirdPdf.url,
                    contentType: "application/pdf",
                    size: thirdPdf.size,
                },
            ],
        });
    });
});
