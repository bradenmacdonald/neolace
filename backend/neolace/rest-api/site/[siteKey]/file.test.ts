import { VNID } from "neolace/deps/vertex-framework.ts";
import {
    assertEquals,
    assertNotEquals,
    assertRejects,
    getClient,
    group,
    SDK,
    setTestIsolation,
    test,
} from "neolace/rest-api/tests.ts";
import { getGraph } from "neolace/core/graph.ts";
import { TempFile } from "neolace/core/edit/TempFile.ts";

group("file.ts", () => {
    group("TempFileResource.POST - Upload a temporary file", () => {
        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);

        const fileContents = "hello world, I'm some example content";
        const fileToUpload = new File([fileContents], "foo.txt", { type: "text/plain" });

        test("Does not allow an anonymous user to upload a temp file", async () => {
            const anonClient = await getClient(undefined, defaultData.site.key);

            await assertRejects(
                () => anonClient.uploadFile(fileToUpload, {}),
                SDK.NotAuthenticated,
            );
        });

        test("Can upload a temporary file", async () => {
            const client = await getClient(defaultData.users.admin, defaultData.site.key);

            // Upload the file:
            const { tempFileId } = await client.uploadFile(fileToUpload, {});

            // Validate the file upload using internal APIs:
            const uploadDetails = await dataFileForTempFileId(tempFileId);
            assertEquals(
                await (await fetch(uploadDetails.publicUrl)).text(),
                fileContents,
            );
            // It should have preserved the content-type all the way through:
            assertEquals((await fetch(uploadDetails.publicUrl)).headers.get("Content-Type"), "text/plain");
        });

        test("De-duplicates files where possible", async () => {
            const client = await getClient(defaultData.users.admin, defaultData.site.key);

            // Upload the file twice:
            const { tempFileId: tempFileId1 } = await client.uploadFile(fileToUpload, {});
            const { tempFileId: tempFileId2 } = await client.uploadFile(fileToUpload, {});

            // Validate the file upload using internal APIs:
            const uploadDetails1 = await dataFileForTempFileId(tempFileId1);
            const uploadDetails2 = await dataFileForTempFileId(tempFileId2);
            assertEquals(uploadDetails1.publicUrl, uploadDetails2.publicUrl);

            // But uploading a different file should have a different URL:
            const otherFile = new File(["different contents"], "foo.txt", { type: "text/plain" });
            const { tempFileId: tempFileId3 } = await client.uploadFile(otherFile, {});
            const uploadDetails3 = await dataFileForTempFileId(tempFileId3);
            assertNotEquals(uploadDetails1.publicUrl, uploadDetails3.publicUrl);
        });
    });
});

// Helper methods just for these tests
async function dataFileForTempFileId(
    draftFileId: VNID,
): Promise<{ id: VNID; contentType: string; publicUrl: string }> {
    const graph = await getGraph();
    const result = await graph.read((tx) =>
        tx.pullOne(TempFile, (df) => df.dataFile((df) => df.id.contentType.publicUrl()), { key: draftFileId })
    );
    return result.dataFile!;
}
