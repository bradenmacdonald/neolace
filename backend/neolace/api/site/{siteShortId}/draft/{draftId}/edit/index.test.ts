import { VNID } from "neolace/deps/vertex-framework.ts";
import { api, assertEquals, getClient, group, setTestIsolation, test } from "neolace/api/tests.ts";

group("index.ts", () => {
    group("DraftEditsResource.POST - Add an edit to a draft", () => {
        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);

        test("Allows adding an edit to a draft", async () => {
            const client = await getClient(defaultData.users.admin, defaultData.site.shortId);

            const { id } = await client.createDraft({
                title: "New Draft",
                description: "Testing file uploads",
                edits: [],
            });

            const draft = await client.getDraft(id, { flags: [api.GetDraftFlags.IncludeEdits] });
            assertEquals(draft.edits?.length, 0);

            await client.addEditToDraft({
                code: "CreateEntry",
                data: {
                    name: "A new Entry",
                    id: VNID(),
                    description: "Testing",
                    friendlyId: "new-entry",
                    type: defaultData.schema.entryTypes._ETSPECIES.id,
                },
            }, { draftId: id });

            const newDraft = await client.getDraft(id, { flags: [api.GetDraftFlags.IncludeEdits] });
            assertEquals(newDraft.edits?.length, 1);
            assertEquals(newDraft.edits![0].code, "CreateEntry");
        });
    });
});
