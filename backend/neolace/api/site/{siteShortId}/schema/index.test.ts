import { VNID } from "neolace/deps/vertex-framework.ts";
import { graph } from "neolace/core/graph.ts";
import { AccessMode, UpdateSite } from "neolace/core/Site.ts";
import { group, test, setTestIsolation, api, getClient, assertEquals, assertThrowsAsync } from "neolace/api/tests.ts";

group(import.meta, () => {

    group("Site Schema API", () => {

        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);

        /**
         * This tests retrieving a site's schema, but because it depends on a schema loaded from a fixture, it also
         * tests ImportSchema, diffSchema, and ApplyEdits
         */
        test("can get a site's schema", async () => {
            // Get an API client, logged in as a bot that belongs to an admin
            const client = await getClient(defaultData.users.admin, defaultData.site.shortId);
            const result = await client.getSiteSchema();

            assertEquals(result, defaultData.schema);
        });

        test("permissions for getting a site's schema", async () => {
            // Get an API client as different users
            const adminClient = await getClient(defaultData.users.admin, defaultData.site.shortId);
            //const userClient = await getClient(defaultData.users.regularUser, defaultData.site.shortId);
            const anonClient = await getClient(undefined, defaultData.site.shortId);

            // Make the site private:
            await graph.runAsSystem(UpdateSite({
                key: defaultData.site.id,
                accessMode: AccessMode.Private,
            }));
            // Now the admin user should be able to get the schema, but not the anonymous client:
            assertEquals(await adminClient.getSiteSchema(), defaultData.schema);
            await assertThrowsAsync(
                () => anonClient.getSiteSchema(),
                api.NotAuthenticated,
            );
        });

        test("can create a new entry type", async () => {
            const client = await getClient(defaultData.users.admin, defaultData.site.shortId);
            assertEquals(await client.getSiteSchema(), defaultData.schema);
            // Create a draft with a new entry type:
            const result = await client.createDraft({
                title: "Add Software EntryType",
                description: "This adds a new entry type, 'software'.",
                edits: [
                    {
                        code: "CreateEntryType",
                        data: { id: VNID("_ETSOFTWARE"), name: "Software"},
                    },
                ],
            });
            // Accept the draft:
            await client.acceptDraft(result.id);
            // Now the new entry type should exist:
            assertEquals(await client.getSiteSchema(), {
                entryTypes: {
                    ...defaultData.schema.entryTypes,
                    _ETSOFTWARE: {
                        id: VNID("_ETSOFTWARE"),
                        contentType: api.ContentType.None,
                        description: null,
                        friendlyIdPrefix: null,
                        name: "Software",
                        computedFacts: {},
                    },
                },
                relationshipTypes: defaultData.schema.relationshipTypes,
            });
        });

    })
});
