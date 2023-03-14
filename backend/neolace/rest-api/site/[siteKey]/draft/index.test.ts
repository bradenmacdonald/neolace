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
import {
    assert,
    assertEquals,
    assertInstanceOf,
    assertRejects,
    createUserWithPermissions,
    getClient,
    group,
    SDK,
    setTestIsolation,
    test,
} from "neolace/rest-api/tests.ts";
import { getGraph } from "neolace/core/graph.ts";
import { AccessMode, UpdateSite } from "neolace/core/Site.ts";
import { Always, PermissionGrant } from "neolace/core/permissions/grant.ts";
import { corePerm } from "neolace/core/permissions/permissions.ts";

group("index.ts", () => {
    group("Creating a draft", () => {
        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);

        group("An empty draft", () => {
            test("Creating an empty draft is allowed", async () => {
                // Get an API client, logged in as a bot that belongs to an admin
                const client = await getClient(defaultData.users.admin, defaultData.site.key);
                client.createDraft({ title: "A Test Draft", edits: [] });
            });
        });

        group("Invalid draft data", () => {
            test("cannot create a draft with an empty title", async () => {
                const client = await getClient(defaultData.users.admin, defaultData.site.key);
                const err = await assertRejects(() =>
                    client.createDraft({
                        title: "",
                        edits: [{
                            code: SDK.CreateEntryType.code,
                            data: SDK.CreateEntryType.dataSchema({ key: "et-new", name: "New EntryType" }),
                        }],
                    })
                );
                assertInstanceOf(err, SDK.InvalidFieldValue);
                assertEquals(err.fieldErrors[0].fieldPath, "title");
            });

            test("cannot create a draft with invalid edits", async () => {
                const client = await getClient(defaultData.users.admin, defaultData.site.key);
                // Try creating a draft with an invalid edit code:
                const err = await assertRejects(() =>
                    client.createDraft({
                        title: "Invalid edits",
                        edits: [
                            // deno-lint-ignore no-explicit-any
                            { code: "FOOBAR", data: {} } as any,
                        ],
                    })
                );
                assertInstanceOf(err, SDK.InvalidFieldValue);
                assertEquals(err.fieldErrors[0].fieldPath, "edits.0.code");
                // Try creating a draft with a valid edit code but invalid data:
                const err2 = await assertRejects(() =>
                    client.createDraft({
                        title: "Invalid edits",
                        edits: [
                            {
                                code: SDK.CreateEntry.code,
                                // deno-lint-ignore no-explicit-any
                                data: { foo: "bar" } as any,
                            },
                        ],
                    })
                );
                assertInstanceOf(err2, SDK.InvalidFieldValue);
                assertEquals(err2.fieldErrors[0].fieldPath, "edits.0.data");
            });
        });

        group("A draft with schema edits", () => {
            const createDraftWithSchemaEdits: SDK.CreateDraftData = {
                title: "A Test Draft",
                edits: [
                    {
                        code: SDK.CreateEntryType.code,
                        data: SDK.CreateEntryType.dataSchema({
                            key: "et-new-1",
                            name: "New EntryType",
                        }),
                    },
                    {
                        code: SDK.UpdateEntryType.code,
                        data: SDK.UpdateEntryType.dataSchema({
                            key: "et-new-1",
                            description: "A new entry type for testing",
                        }),
                    },
                ],
            };

            test("an admin can create schema edits", async () => {
                const client = await getClient(defaultData.users.admin, defaultData.site.key);
                const result = await client.createDraft(createDraftWithSchemaEdits);
                assert(typeof result.num === "number" && result.num > 0);
            });

            test("test permissions - user with no permission grants", async () => {
                const graph = await getGraph();
                // If the site is "private" or "public read only", a user without explicit permissions cannot create content edits.
                const { userData: userWithNoPermissions } = await createUserWithPermissions();
                const noPermsClient = await getClient(userWithNoPermissions, defaultData.site.key);
                // Private site shouldn't work:
                await graph.runAsSystem(UpdateSite({ accessMode: AccessMode.Private, id: defaultData.site.id }));
                await assertRejects(() => noPermsClient.createDraft(createDraftWithSchemaEdits), SDK.NotAuthorized);
                // And "public read only" shouldn't work:
                await graph.runAsSystem(
                    UpdateSite({ accessMode: AccessMode.PublicReadOnly, id: defaultData.site.id }),
                );
                await assertRejects(() => noPermsClient.createDraft(createDraftWithSchemaEdits), SDK.NotAuthorized);
                // But "public contributions" site should accept it:
                await graph.runAsSystem(
                    UpdateSite({ accessMode: AccessMode.PublicContributions, id: defaultData.site.id }),
                );
                const result = await noPermsClient.createDraft(createDraftWithSchemaEdits);
                assert(typeof result.num === "number" && result.num > 0);
            });

            test("test permissions - user with explicit permissions", async () => {
                const graph = await getGraph();
                // On a site in private mode:
                await graph.runAsSystem(UpdateSite({ accessMode: AccessMode.Private, id: defaultData.site.id }));
                // A user with "propose schema changes" can create a draft with schema edits:
                {
                    const { userData } = await createUserWithPermissions(
                        new PermissionGrant(Always, [
                            corePerm.viewSite.name,
                            corePerm.viewSchema.name,
                            corePerm.proposeEditToSchema.name,
                        ]),
                    );
                    const client = await getClient(userData, defaultData.site.key);
                    const result = await client.createDraft(createDraftWithSchemaEdits);
                    assert(typeof result.num === "number" && result.num > 0);
                }
                // But "propose schema edits" doesn't work without "view schema"
                {
                    const { userData } = await createUserWithPermissions(
                        new PermissionGrant(Always, [corePerm.viewSite.name, corePerm.proposeEditToSchema.name]),
                    );
                    const client = await getClient(userData, defaultData.site.key);
                    await assertRejects(
                        () => client.createDraft(createDraftWithSchemaEdits),
                        SDK.NotAuthorized,
                    );
                }
                // And "propose **entry** edits" only does not allow proposing schema edits:
                {
                    const { userData } = await createUserWithPermissions(
                        new PermissionGrant(Always, [
                            corePerm.viewSite.name,
                            corePerm.viewSchema.name,
                            corePerm.proposeEditToEntry.name,
                        ]),
                    );
                    const client = await getClient(userData, defaultData.site.key);
                    await assertRejects(
                        () => client.createDraft(createDraftWithSchemaEdits),
                        SDK.NotAuthorized,
                    );
                }
            });
        });

        group("A draft with content edits", () => {
            const createDraftWithContentEdits: SDK.CreateDraftData = {
                title: "A Test Draft",
                edits: [
                    {
                        code: SDK.CreateEntry.code,
                        data: SDK.CreateEntry.dataSchema({
                            entryId: VNID(),
                            name: "A New Entry",
                            key: "test-entry",
                            description: "",
                            entryTypeKey: defaultData.schema.entryTypes.ETSPECIES.key,
                        }),
                    },
                ],
            };

            test("an admin can create content edits", async () => {
                const client = await getClient(defaultData.users.admin, defaultData.site.key);
                const result = await client.createDraft(createDraftWithContentEdits);
                assert(typeof result.num === "number" && result.num > 0);
            });

            test("test permissions - user with no permission grants", async () => {
                const graph = await getGraph();
                // If the site is "private" or "public read only", a user without explicit permissions cannot create content edits.
                const { userData: userWithNoPermissions } = await createUserWithPermissions();
                const noPermsClient = await getClient(userWithNoPermissions, defaultData.site.key);
                // Private site shouldn't work:
                await graph.runAsSystem(UpdateSite({ accessMode: AccessMode.Private, id: defaultData.site.id }));
                await assertRejects(() => noPermsClient.createDraft(createDraftWithContentEdits), SDK.NotAuthorized);
                // And "public read only" shouldn't work:
                await graph.runAsSystem(
                    UpdateSite({ accessMode: AccessMode.PublicReadOnly, id: defaultData.site.id }),
                );
                await assertRejects(() => noPermsClient.createDraft(createDraftWithContentEdits), SDK.NotAuthorized);
                // But "public contributions" site should accept it:
                await graph.runAsSystem(
                    UpdateSite({ accessMode: AccessMode.PublicContributions, id: defaultData.site.id }),
                );
                const result = await noPermsClient.createDraft(createDraftWithContentEdits);
                assert(typeof result.num === "number" && result.num > 0);
            });

            test("test permissions - user with explicit permissions", async () => {
                const graph = await getGraph();
                // Set the site to "public read only":
                await graph.runAsSystem(
                    UpdateSite({ accessMode: AccessMode.PublicReadOnly, id: defaultData.site.id }),
                );

                // A user with only "propose schema changes" cannot propose content edits:
                {
                    const { userData } = await createUserWithPermissions(
                        new PermissionGrant(Always, [SDK.CorePerm.proposeEditToSchema]),
                    );
                    const client = await getClient(userData, defaultData.site.key);
                    await assertRejects(() => client.createDraft(createDraftWithContentEdits), SDK.NotAuthorized);
                }
                // A user with only "edit entry" but not "create new entry" cannot create a new entry:
                {
                    const { userData } = await createUserWithPermissions(
                        new PermissionGrant(Always, [SDK.CorePerm.proposeEditToEntry]),
                    );
                    const client = await getClient(userData, defaultData.site.key);
                    await assertRejects(() => client.createDraft(createDraftWithContentEdits), SDK.NotAuthorized);
                }
                // But a user with "propose new entries" permission can:
                {
                    const { userData } = await createUserWithPermissions(
                        new PermissionGrant(Always, [SDK.CorePerm.proposeNewEntry]),
                    );
                    const client = await getClient(userData, defaultData.site.key);
                    const result = await client.createDraft(createDraftWithContentEdits);
                    assert(typeof result.num === "number" && result.num > 0);
                }
            });
        });
    });
    group("listing site drafts", () => {
        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);

        test("Listing drafts on PlantDB site", async () => {
            // Get an API client, logged in as a bot that belongs to an admin
            const client = await getClient(defaultData.users.admin, defaultData.site.key);

            const drafts = await client.listDrafts();
            // The script that creates the PlantDB sample content currently only creates one draft:
            assertEquals(drafts, {
                values: [{
                    num: drafts.values[0].num,
                    title: "Hero Image Upload Draft",
                    created: drafts.values[0].created,
                    author: { username: "system", fullName: "System" },
                    description: "Uploading images for PlantDB sample content.",
                    status: SDK.DraftStatus.Accepted,
                }],
                totalCount: 1,
            });
            assertInstanceOf(drafts.values[0].created, Date);
        });

        test("test permissions - user with no permission grants", async () => {
            const graph = await getGraph();
            // If the site is "private" or "public read only", a user without explicit permissions cannot create content edits.
            const { userData: userWithNoPermissions } = await createUserWithPermissions();
            const noPermsClient = await getClient(userWithNoPermissions, defaultData.site.key);
            // Private site shouldn't work:
            await graph.runAsSystem(UpdateSite({ accessMode: AccessMode.Private, id: defaultData.site.id }));
            const results = await noPermsClient.listDrafts();
            // It always succeeds but will simply return no drafts, as the drafts that the user doesn't have
            // permission to see are filtered out:
            assertEquals(results, {
                values: [],
                totalCount: 0,
            });
        });
    });
});
