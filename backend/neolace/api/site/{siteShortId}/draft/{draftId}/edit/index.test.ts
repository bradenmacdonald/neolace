import { VNID } from "neolace/deps/vertex-framework.ts";
import { api, assertEquals, getClient, group, setTestIsolation, test } from "neolace/api/tests.ts";

group("index.ts", () => {
    group("DraftEditsResource.POST - Add an edit to a draft", () => {
        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);

        test("Allows adding an edit to a draft", async () => {
            const client = await getClient(defaultData.users.admin, defaultData.site.shortId);

            const entryId = VNID();

            const { id } = await client.createDraft({
                title: "New Draft",
                description: "Testing file uploads",
                edits: [
                    {
                        code: "CreateEntry",
                        data: {
                            entryId,
                            name: "A new Entry",
                            description: "Testing",
                            friendlyId: "new-entry",
                            type: defaultData.schema.entryTypes._ETSPECIES.id,
                        },
                    },
                ],
            });

            const draft = await client.getDraft(id, { flags: [api.GetDraftFlags.IncludeEdits] });
            assertEquals(draft.edits?.length, 1);

            // Test an edit that modifies an existing entry:
            await client.addEditToDraft({
                code: "SetEntryName",
                data: {
                    entryId: defaultData.entries.ponderosaPine.id,
                    name: "New Name 1",
                },
            }, { draftId: id });

            const newDraft1 = await client.getDraft(id, { flags: [api.GetDraftFlags.IncludeEdits] });
            assertEquals(newDraft1.edits?.length, 2);
            assertEquals(newDraft1.edits![1].code, "SetEntryName");

            // Test an edit that modifies our new entry that was created in the same draft:
            await client.addEditToDraft({
                code: "SetEntryName",
                data: {
                    entryId,
                    name: "New Name 2",
                },
            }, { draftId: id });

            const newDraft2 = await client.getDraft(id, { flags: [api.GetDraftFlags.IncludeEdits] });
            assertEquals(newDraft2.edits?.length, 3);
            assertEquals(newDraft2.edits![2].code, "SetEntryName");
        });
    });
});
