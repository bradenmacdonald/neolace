import { VNID } from "neolace/deps/vertex-framework.ts";
import {
    api,
    assert,
    assertEquals,
    assertInstanceOf,
    assertRejects,
    createUserWithPermissions,
    getClient,
    group,
    setTestIsolation,
    test,
} from "neolace/api/tests.ts";
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
                const client = await getClient(defaultData.users.admin, defaultData.site.shortId);
                client.createDraft({ title: "A Test Draft", edits: [] });
            });
        });

        group("Invalid draft data", () => {
            test("cannot create a draft with an empty title", async () => {
                const client = await getClient(defaultData.users.admin, defaultData.site.shortId);
                const err = await assertRejects(() =>
                    client.createDraft({
                        title: "",
                        edits: [{
                            code: api.CreateEntryType.code,
                            data: api.CreateEntryType.dataSchema({ id: VNID(), name: "New EntryType" }),
                        }],
                    })
                );
                assertInstanceOf(err, api.InvalidFieldValue);
                assertEquals(err.fieldErrors[0].fieldPath, "title");
            });

            test("cannot create a draft with invalid edits", async () => {
                const client = await getClient(defaultData.users.admin, defaultData.site.shortId);
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
                assertInstanceOf(err, api.InvalidFieldValue);
                assertEquals(err.fieldErrors[0].fieldPath, "edits.0.code");
                // Try creating a draft with a valid edit code but invalid data:
                const err2 = await assertRejects(() =>
                    client.createDraft({
                        title: "Invalid edits",
                        edits: [
                            {
                                code: api.CreateEntry.code,
                                // deno-lint-ignore no-explicit-any
                                data: { foo: "bar" } as any,
                            },
                        ],
                    })
                );
                assertInstanceOf(err2, api.InvalidFieldValue);
                assertEquals(err2.fieldErrors[0].fieldPath, "edits.0.data");
            });
        });

        group("A draft with schema edits", () => {
            const createDraftWithSchemaEdits: api.CreateDraftData = {
                title: "A Test Draft",
                edits: [
                    {
                        code: api.CreateEntryType.code,
                        data: api.CreateEntryType.dataSchema({
                            id: VNID(),
                            name: "New EntryType",
                        }),
                    },
                    {
                        code: api.UpdateEntryType.code,
                        data: api.UpdateEntryType.dataSchema({
                            id: VNID(),
                            description: "A new entry type for testing",
                        }),
                    },
                ],
            };

            test("an admin can create schema edits", async () => {
                const client = await getClient(defaultData.users.admin, defaultData.site.shortId);
                const result = await client.createDraft(createDraftWithSchemaEdits);
                assert(typeof result.idNum === "number" && result.idNum > 0);
            });

            test("test permissions - user with no permission grants", async () => {
                const graph = await getGraph();
                // If the site is "private" or "public read only", a user without explicit permissions cannot create content edits.
                const { userData: userWithNoPermissions } = await createUserWithPermissions();
                const noPermsClient = await getClient(userWithNoPermissions, defaultData.site.shortId);
                // Private site shouldn't work:
                await graph.runAsSystem(UpdateSite({ accessMode: AccessMode.Private, key: defaultData.site.id }));
                await assertRejects(() => noPermsClient.createDraft(createDraftWithSchemaEdits), api.NotAuthorized);
                // And "public read only" shouldn't work:
                await graph.runAsSystem(
                    UpdateSite({ accessMode: AccessMode.PublicReadOnly, key: defaultData.site.id }),
                );
                await assertRejects(() => noPermsClient.createDraft(createDraftWithSchemaEdits), api.NotAuthorized);
                // But "public contributions" site should accept it:
                await graph.runAsSystem(
                    UpdateSite({ accessMode: AccessMode.PublicContributions, key: defaultData.site.id }),
                );
                const result = await noPermsClient.createDraft(createDraftWithSchemaEdits);
                assert(typeof result.idNum === "number" && result.idNum > 0);
            });

            test("test permissions - user with explicit permissions", async () => {
                const graph = await getGraph();
                // On a site in private mode:
                await graph.runAsSystem(UpdateSite({ accessMode: AccessMode.Private, key: defaultData.site.id }));
                // A user with "propose schema changes" can create a draft with schema edits:
                {
                    const { userData } = await createUserWithPermissions(
                        new PermissionGrant(Always, [
                            corePerm.viewSite.name,
                            corePerm.viewSchema.name,
                            corePerm.proposeEditToSchema.name,
                        ]),
                    );
                    const client = await getClient(userData, defaultData.site.shortId);
                    const result = await client.createDraft(createDraftWithSchemaEdits);
                    assert(typeof result.idNum === "number" && result.idNum > 0);
                }
                // But "propose schema edits" doesn't work without "view schema"
                {
                    const { userData } = await createUserWithPermissions(
                        new PermissionGrant(Always, [corePerm.viewSite.name, corePerm.proposeEditToSchema.name]),
                    );
                    const client = await getClient(userData, defaultData.site.shortId);
                    await assertRejects(
                        () => client.createDraft(createDraftWithSchemaEdits),
                        api.NotAuthorized,
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
                    const client = await getClient(userData, defaultData.site.shortId);
                    await assertRejects(
                        () => client.createDraft(createDraftWithSchemaEdits),
                        api.NotAuthorized,
                    );
                }
            });
        });

        group("A draft with content edits", () => {
            const createDraftWithContentEdits: api.CreateDraftData = {
                title: "A Test Draft",
                edits: [
                    {
                        code: api.CreateEntry.code,
                        data: api.CreateEntry.dataSchema({
                            entryId: VNID(),
                            name: "A New Entry",
                            friendlyId: "test-entry",
                            description: "",
                            type: defaultData.schema.entryTypes._ETSPECIES.id,
                        }),
                    },
                ],
            };

            test("an admin can create content edits", async () => {
                const client = await getClient(defaultData.users.admin, defaultData.site.shortId);
                const result = await client.createDraft(createDraftWithContentEdits);
                assert(typeof result.idNum === "number" && result.idNum > 0);
            });

            test("test permissions - user with no permission grants", async () => {
                const graph = await getGraph();
                // If the site is "private" or "public read only", a user without explicit permissions cannot create content edits.
                const { userData: userWithNoPermissions } = await createUserWithPermissions();
                const noPermsClient = await getClient(userWithNoPermissions, defaultData.site.shortId);
                // Private site shouldn't work:
                await graph.runAsSystem(UpdateSite({ accessMode: AccessMode.Private, key: defaultData.site.id }));
                await assertRejects(() => noPermsClient.createDraft(createDraftWithContentEdits), api.NotAuthorized);
                // And "public read only" shouldn't work:
                await graph.runAsSystem(
                    UpdateSite({ accessMode: AccessMode.PublicReadOnly, key: defaultData.site.id }),
                );
                await assertRejects(() => noPermsClient.createDraft(createDraftWithContentEdits), api.NotAuthorized);
                // But "public contributions" site should accept it:
                await graph.runAsSystem(
                    UpdateSite({ accessMode: AccessMode.PublicContributions, key: defaultData.site.id }),
                );
                const result = await noPermsClient.createDraft(createDraftWithContentEdits);
                assert(typeof result.idNum === "number" && result.idNum > 0);
            });

            test("test permissions - user with explicit permissions", async () => {
                const graph = await getGraph();
                // Set the site to "public read only":
                await graph.runAsSystem(
                    UpdateSite({ accessMode: AccessMode.PublicReadOnly, key: defaultData.site.id }),
                );

                // A user with only "propose schema changes" cannot propose content edits:
                {
                    const { userData } = await createUserWithPermissions(
                        new PermissionGrant(Always, [api.CorePerm.proposeEditToSchema]),
                    );
                    const client = await getClient(userData, defaultData.site.shortId);
                    await assertRejects(() => client.createDraft(createDraftWithContentEdits), api.NotAuthorized);
                }
                // A user with only "edit entry" but not "create new entry" cannot create a new entry:
                {
                    const { userData } = await createUserWithPermissions(
                        new PermissionGrant(Always, [api.CorePerm.proposeEditToEntry]),
                    );
                    const client = await getClient(userData, defaultData.site.shortId);
                    await assertRejects(() => client.createDraft(createDraftWithContentEdits), api.NotAuthorized);
                }
                // But a user with "propose new entries" permission can:
                {
                    const { userData } = await createUserWithPermissions(
                        new PermissionGrant(Always, [api.CorePerm.proposeNewEntry]),
                    );
                    const client = await getClient(userData, defaultData.site.shortId);
                    const result = await client.createDraft(createDraftWithContentEdits);
                    assert(typeof result.idNum === "number" && result.idNum > 0);
                }
            });
        });
    });
    group("listing site drafts", () => {
        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);

        test("Listing drafts on PlantDB site", async () => {
            // Get an API client, logged in as a bot that belongs to an admin
            const client = await getClient(defaultData.users.admin, defaultData.site.shortId);

            const drafts = await client.listDrafts();
            // The script that creates the PlantDB sample content currently only creates one draft:
            assertEquals(drafts, {
                values: [{
                    idNum: drafts.values[0].idNum,
                    title: "Hero Image Upload Draft",
                    created: drafts.values[0].created,
                    author: { username: "system", fullName: "System" },
                    description: "Uploading images for PlantDB sample content.",
                    status: api.DraftStatus.Accepted,
                }],
                totalCount: 1,
            });
            assertInstanceOf(drafts.values[0].created, Date);
        });

        test("test permissions - user with no permission grants", async () => {
            const graph = await getGraph();
            // If the site is "private" or "public read only", a user without explicit permissions cannot create content edits.
            const { userData: userWithNoPermissions } = await createUserWithPermissions();
            const noPermsClient = await getClient(userWithNoPermissions, defaultData.site.shortId);
            // Private site shouldn't work:
            await graph.runAsSystem(UpdateSite({ accessMode: AccessMode.Private, key: defaultData.site.id }));
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
