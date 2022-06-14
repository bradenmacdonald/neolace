import { isVNID, VNID } from "neolace/deps/vertex-framework.ts";
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
            test("an admin can create an empty draft", async () => {
                // Get an API client, logged in as a bot that belongs to an admin
                const client = await getClient(defaultData.users.admin, defaultData.site.shortId);
                const result = await client.createDraft({
                    title: "A Test Draft",
                    description: null,
                    edits: [],
                });
                assert(isVNID(result.id));
            });

            /**
             * This tests creating an empty draft on a site that doesn't allow public contributions
             */
            test("test permissions - PublicReadOnly Site", async () => {
                const graph = await getGraph();
                // Set Access Mode to PublicReadOnly:
                await graph.runAsSystem(UpdateSite({
                    key: defaultData.site.id,
                    accessMode: AccessMode.PublicReadOnly,
                }));

                const createDraftArgs: api.CreateDraftData = {
                    title: "A Test Draft",
                    description: null,
                    edits: [],
                };

                // A user with no particular permissions should not be allowed to create a draft, even an empty one.
                {
                    const { userData } = await createUserWithPermissions();
                    const client = await getClient(userData, defaultData.site.shortId);
                    await assertRejects(
                        () => client.createDraft(createDraftArgs),
                        api.NotAuthorized,
                    );
                }

                // A user with either "propose schema changes" or "propose content changes" can create an empty draft though.
                {
                    const { userData } = await createUserWithPermissions(
                        new PermissionGrant(Always, [corePerm.proposeEditToSchema.name]),
                    );
                    const client = await getClient(userData, defaultData.site.shortId);
                    const result = await client.createDraft(createDraftArgs);
                    assert(isVNID(result.id));
                }
                {
                    const { userData } = await createUserWithPermissions(
                        new PermissionGrant(Always, [corePerm.proposeEditToEntry.name]),
                    );
                    const client = await getClient(userData, defaultData.site.shortId);
                    const result = await client.createDraft(createDraftArgs);
                    assert(isVNID(result.id));
                }
            });

            /**
             * This tests creating an empty draft on a site that does allow public contributions
             */
            test("test permissions - PublicContributions Site", async () => {
                const graph = await getGraph();
                // Set Access Mode to PublicReadOnly:
                await graph.runAsSystem(UpdateSite({
                    key: defaultData.site.id,
                    accessMode: AccessMode.PublicContributions,
                }));

                const createDraftArgs: api.CreateDraftData = {
                    title: "A Test Draft",
                    description: null,
                    edits: [],
                };

                // A user with no particular permissions should still be allowed to create a draft, even an empty one.
                {
                    const { userData } = await createUserWithPermissions();
                    const client = await getClient(userData, defaultData.site.shortId);
                    const result = await client.createDraft(createDraftArgs);
                    assert(isVNID(result.id));
                }
            });
        });

        group("Invalid draft data", () => {
            test("cannot create a draft with an empty title", async () => {
                const client = await getClient(defaultData.users.admin, defaultData.site.shortId);
                await assertRejects(
                    () => client.createDraft({ title: "", description: null, edits: [] }),
                    (err: Error) => {
                        assertInstanceOf(err, api.InvalidFieldValue);
                        assertEquals(err.fieldErrors[0].fieldPath, "title");
                    },
                );
            });

            test("cannot create a draft with invalid edits", async () => {
                const client = await getClient(defaultData.users.admin, defaultData.site.shortId);
                // Try creating a draft with an invalid edit code:
                await assertRejects(
                    () =>
                        client.createDraft({
                            title: "Invalid edits",
                            description: null,
                            edits: [
                                {
                                    code: "FOOBAR",
                                    data: {},
                                    // deno-lint-ignore no-explicit-any
                                } as any,
                            ],
                        }),
                    (err: Error) => {
                        assertInstanceOf(err, api.InvalidFieldValue);
                        assertEquals(err.fieldErrors[0].fieldPath, "edits.0.code");
                    },
                );
                // Try creating a draft with a valid edit code but invalid data:
                await assertRejects(
                    () =>
                        client.createDraft({
                            title: "Invalid edits",
                            description: null,
                            edits: [
                                {
                                    code: api.CreateEntry.code,
                                    // deno-lint-ignore no-explicit-any
                                    data: { foo: "bar" } as any,
                                },
                            ],
                        }),
                    (err: Error) => {
                        assertInstanceOf(err, api.InvalidFieldValue);
                        assertEquals(err.fieldErrors[0].fieldPath, "edits.0.data");
                    },
                );
            });
        });

        group("A draft with schema edits", () => {
            const createDraftWithSchemaEdits: api.CreateDraftData = {
                title: "A Test Draft",
                description: null,
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
                assert(isVNID(result.id));
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
                assert(isVNID(result.id));
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
                    assert(isVNID(result.id));
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
                description: null,
                edits: [
                    {
                        code: api.CreateEntry.code,
                        data: api.CreateEntry.dataSchema({
                            id: VNID(),
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
                assert(isVNID(result.id));
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
                assert(isVNID(result.id));
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
                        new PermissionGrant(Always, [corePerm.proposeEditToSchema.name]),
                    );
                    const client = await getClient(userData, defaultData.site.shortId);
                    await assertRejects(() => client.createDraft(createDraftWithContentEdits), api.NotAuthorized);
                }
                // But a user with "propose entry edits" permission can:
                {
                    const { userData } = await createUserWithPermissions(
                        new PermissionGrant(Always, [corePerm.proposeEditToEntry.name]),
                    );
                    const client = await getClient(userData, defaultData.site.shortId);
                    const result = await client.createDraft(createDraftWithContentEdits);
                    assert(isVNID(result.id));
                }
            });
        });
    });
});
