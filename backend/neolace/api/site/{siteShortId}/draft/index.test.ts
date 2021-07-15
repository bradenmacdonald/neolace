import { isVNID } from "neolace/deps/vertex-framework.ts";
import { group, test, setTestIsolation, assert, getClient, createUserWithPermissions, api, assertThrowsAsync } from "neolace/api/tests.ts";
import { PermissionGrant } from "neolace/core/Group.ts";
import { graph } from "neolace/core/graph.ts";
import { AccessMode, UpdateSite } from "neolace/core/Site.ts";

group(import.meta, () => {

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
                    const {userData} = await createUserWithPermissions(new Set());
                    const client = await getClient(userData, defaultData.site.shortId);
                    await assertThrowsAsync(
                        () => client.createDraft(createDraftArgs),
                        api.NotAuthorized,
                    );
                }

                // A user with either "propose schema changes" or "propose content changes" can create an empty draft though.
                {
                    const {userData} = await createUserWithPermissions(new Set([PermissionGrant.proposeSchemaChanges]));
                    const client = await getClient(userData, defaultData.site.shortId);
                    const result = await client.createDraft(createDraftArgs);
                    assert(isVNID(result.id));
                }
                {
                    const {userData} = await createUserWithPermissions(new Set([PermissionGrant.proposeEntryEdits]));
                    const client = await getClient(userData, defaultData.site.shortId);
                    const result = await client.createDraft(createDraftArgs);
                    assert(isVNID(result.id));
                }
            });

            /**
             * This tests creating an empty draft on a site that does allow public contributions
             */
            test("test permissions - PublicContributions Site", async () => {

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
                    const {userData} = await createUserWithPermissions(new Set());
                    const client = await getClient(userData, defaultData.site.shortId);
                    const result = await client.createDraft(createDraftArgs);
                    assert(isVNID(result.id));
                }
            });

        });

    });
});
