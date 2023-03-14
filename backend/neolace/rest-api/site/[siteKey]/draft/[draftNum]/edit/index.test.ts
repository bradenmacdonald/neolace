/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { VNID } from "neolace/deps/vertex-framework.ts";
import { assertEquals, getClient, group, SDK, setTestIsolation, test } from "neolace/rest-api/tests.ts";

group("index.ts", () => {
    group("DraftEditsResource.POST - Add an edit to a draft", () => {
        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);

        test("Allows adding an edit to a draft", async () => {
            const client = await getClient(defaultData.users.admin, defaultData.site.key);

            const entryId = VNID();

            const { num: draftNum } = await client.createDraft({
                title: "New Draft",
                description: "Testing file uploads",
                edits: [
                    {
                        code: "CreateEntry",
                        data: {
                            entryId,
                            name: "A new Entry",
                            description: "Testing",
                            key: "new-entry",
                            entryTypeKey: defaultData.schema.entryTypes.ETSPECIES.key,
                        },
                    },
                ],
            });

            const draft = await client.getDraft(draftNum, { flags: [SDK.GetDraftFlags.IncludeEdits] });
            assertEquals(draft.edits?.length, 1);

            // Test an edit that modifies an existing entry:
            await client.addEditToDraft({
                code: "SetEntryName",
                data: {
                    entryId: defaultData.entries.ponderosaPine.id,
                    name: "New Name 1",
                },
            }, { draftNum });

            const newDraft1 = await client.getDraft(draftNum, { flags: [SDK.GetDraftFlags.IncludeEdits] });
            assertEquals(newDraft1.edits?.length, 2);
            assertEquals(newDraft1.edits![1].code, "SetEntryName");

            // Test an edit that modifies our new entry that was created in the same draft:
            await client.addEditToDraft({
                code: "SetEntryName",
                data: {
                    entryId,
                    name: "New Name 2",
                },
            }, { draftNum });

            const newDraft2 = await client.getDraft(draftNum, { flags: [SDK.GetDraftFlags.IncludeEdits] });
            assertEquals(newDraft2.edits?.length, 3);
            assertEquals(newDraft2.edits![2].code, "SetEntryName");
        });
    });
});
