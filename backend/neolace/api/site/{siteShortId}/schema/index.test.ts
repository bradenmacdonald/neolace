import { NotAuthenticated } from "neolace-api";
import { graph } from "../../../../core/graph";
import { AccessMode, UpdateSite } from "../../../../core/Site";
import { suite, test, assert, before, beforeEach, setTestIsolation, getClient, assertRejectsWith, assertRejects } from "../../../../lib/intern-tests";

suite(__filename, () => {

    suite("Site Schema API", () => {

        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);

        /**
         * This tests retrieving a site's schema, but because it depends on a schema loaded from a fixture, it also
         * tests ImportSchema, diffSchema, and ApplyEdits
         */
        test("can get a site's schema", async () => {
            // Get an API client, logged in as a bot that belongs to an admin
            const client = getClient(defaultData.users.admin, defaultData.site.shortId);
            const result = await client.getSiteSchema();

            assert.deepStrictEqual(result, defaultData.schema);
        });

        test("permissions for getting a site's schema", async () => {
            // Get an API client as different users
            const adminClient = getClient(defaultData.users.admin, defaultData.site.shortId);
            //const userClient = getClient(defaultData.users.regularUser, defaultData.site.shortId);
            const anonClient = getClient(undefined, defaultData.site.shortId);

            // Make the site private:
            const result = await graph.runAsSystem(UpdateSite({
                key: defaultData.site.id,
                accessMode: AccessMode.Private,
            }));
            // Now the admin user should be able to get the schema, but not the anonymous client:
            assert.deepStrictEqual(await adminClient.getSiteSchema(), defaultData.schema);
            await assertRejectsWith(
                anonClient.getSiteSchema(),
                NotAuthenticated,
            );
        });

        test("can create a new entry type", async () => {

            // TODO
        });

    })
});
