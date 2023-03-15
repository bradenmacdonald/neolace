/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { getGraph } from "neolace/core/graph.ts";
import { AccessMode, UpdateSite } from "neolace/core/Site.ts";
import { assertEquals, assertRejects, getClient, group, SDK, setTestIsolation, test } from "neolace/rest-api/tests.ts";

group("schema/index.ts", () => {
    group("Site Schema API", () => {
        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);

        /**
         * This tests retrieving a site's schema, but because it depends on a schema loaded from a fixture, it also
         * tests ImportSchema, diffSchema, and ApplyEdits
         */
        test("can get a site's schema", async () => {
            // Get an API client, logged in as a bot that belongs to an admin
            const client = await getClient(defaultData.users.admin, defaultData.site.key);
            const result = await client.getSiteSchema();

            assertEquals(result, defaultData.schema);
        });

        test("permissions for getting a site's schema", async () => {
            const graph = await getGraph();
            // Get an API client as different users
            const adminClient = await getClient(defaultData.users.admin, defaultData.site.key);
            //const userClient = await getClient(defaultData.users.regularUser, defaultData.site.key);
            const anonClient = await getClient(undefined, defaultData.site.key);

            // Make the site private:
            await graph.runAsSystem(UpdateSite({
                id: defaultData.site.id,
                accessMode: AccessMode.Private,
            }));
            // Now the admin user should be able to get the schema, but not the anonymous client:
            assertEquals(await adminClient.getSiteSchema(), defaultData.schema);
            await assertRejects(
                () => anonClient.getSiteSchema(),
                SDK.NotAuthenticated,
            );
        });

        test("can create a new entry type", async () => {
            const client = await getClient(defaultData.users.admin, defaultData.site.key);
            assertEquals(await client.getSiteSchema(), defaultData.schema);
            // Create a draft with a new entry type:
            const result = await client.createDraft({
                title: "Add Software EntryType",
                description: "This adds a new entry type, 'software'.",
                edits: [
                    {
                        code: "CreateEntryType",
                        data: { key: "ETSOFTWARE", name: "Software" },
                    },
                ],
            });
            // Accept the draft:
            await client.acceptDraft(result.num);
            // Now the new entry type should exist:
            assertEquals(await client.getSiteSchema(), {
                entryTypes: {
                    ...defaultData.schema.entryTypes,
                    ETSOFTWARE: {
                        key: "ETSOFTWARE",
                        description: "",
                        keyPrefix: "",
                        name: "Software",
                        enabledFeatures: {},
                        color: SDK.EntryTypeColor.Default,
                        abbreviation: "",
                    },
                },
                properties: defaultData.schema.properties,
            });
        });
    });
});
