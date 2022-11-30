import { VNID } from "neolace/deps/vertex-framework.ts";
import {
    api,
    assertEquals,
    assertNotEquals,
    assertRejects,
    getClient,
    group,
    setTestIsolation,
    test,
} from "neolace/api/tests.ts";
import { getGraph } from "neolace/core/graph.ts";
import { DraftFile } from "neolace/core/edit/Draft.ts";

group("file.ts", () => {
    group("DraftFileResource.POST - Upload a file to a draft", () => {
        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);

        const fileContents = "hello world, I'm some example content";
        const fileToUpload = new File([fileContents], "foo.txt", { type: "text/plain" });

        // We cannot create an empty draft, so this fake edit is used when we create drafts.
        const mockEdit: api.AnyContentEdit = {
            code: "CreateEntry",
            data: {
                entryId: VNID("_123"),
                entryTypeKey: defaultData.schema.entryTypes.ETSPECIES.key,
                name: "",
                description: "",
                key: "",
            },
        };

        test("Does not allow an anonymous user to add a file to a draft", async () => {
            const adminClient = await getClient(defaultData.users.admin, defaultData.site.key);
            const anonClient = await getClient(undefined, defaultData.site.key);

            const draft = await adminClient.createDraft({
                title: "New Draft",
                description: "Testing file uploads",
                edits: [mockEdit],
            });

            await assertRejects(
                () => anonClient.uploadFileToDraft(fileToUpload, { idNum: draft.idNum }),
                api.NotAuthenticated,
            );
        });

        test("Can upload a file to a draft", async () => {
            const client = await getClient(defaultData.users.admin, defaultData.site.key);
            const draft = await client.createDraft({
                title: "New Draft",
                description: "Testing file uploads",
                edits: [mockEdit],
            });

            // Upload the file:
            const { draftFileId } = await client.uploadFileToDraft(fileToUpload, { idNum: draft.idNum });

            // Validate the file upload using internal APIs:
            const uploadDetails = await dataFileForDraftFileId(draftFileId);
            assertEquals(
                await (await fetch(uploadDetails.publicUrl)).text(),
                fileContents,
            );
            // It should have preserved the content-type all the way through:
            assertEquals((await fetch(uploadDetails.publicUrl)).headers.get("Content-Type"), "text/plain");
        });

        test("De-duplicates files where possible", async () => {
            const client = await getClient(defaultData.users.admin, defaultData.site.key);
            const draft = await client.createDraft({
                title: "New Draft",
                description: "Testing file uploads",
                edits: [mockEdit],
            });

            // Upload the file twice:
            const { draftFileId: draftFileId1 } = await client.uploadFileToDraft(fileToUpload, { idNum: draft.idNum });
            const { draftFileId: draftFileId2 } = await client.uploadFileToDraft(fileToUpload, { idNum: draft.idNum });

            // Validate the file upload using internal APIs:
            const uploadDetails1 = await dataFileForDraftFileId(draftFileId1);
            const uploadDetails2 = await dataFileForDraftFileId(draftFileId2);
            assertEquals(uploadDetails1.publicUrl, uploadDetails2.publicUrl);

            // But uploading a different file should have a different URL:
            const otherFile = new File(["different contents"], "foo.txt", { type: "text/plain" });
            const { draftFileId: draftFileId3 } = await client.uploadFileToDraft(otherFile, { idNum: draft.idNum });
            const uploadDetails3 = await dataFileForDraftFileId(draftFileId3);
            assertNotEquals(uploadDetails1.publicUrl, uploadDetails3.publicUrl);
        });
    });
});

// Helper methods just for these tests
async function dataFileForDraftFileId(
    draftFileId: VNID,
): Promise<{ id: VNID; contentType: string; publicUrl: string }> {
    const graph = await getGraph();
    const result = await graph.read((tx) =>
        tx.pullOne(DraftFile, (df) => df.dataFile((df) => df.id.contentType.publicUrl()), { key: draftFileId })
    );
    return result.dataFile!;
}
