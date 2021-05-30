import { NotAuthenticated } from "neolace-api";
import { suite, test, assert, before, beforeEach, setTestIsolation, getClient, assertRejectsWith } from "../../../../lib/intern-tests";

suite(__filename, () => {

    suite("Site Schema API", () => {

        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);

        /**
         * This tests retrieving a site's schema, but because it depends on a schema loaded from a fixture, it also
         * tests ImportSchema, diffSchema, and ApplyEdits
         */
        test("can get a site's schema", async () => {
            // Get an API client, logged in as a bot that belongs to Alex
            const client = getClient(defaultData.users.alex, defaultData.site.id);
            const result = await client.getSiteSchema();

            assert.deepStrictEqual(result, defaultData.schema);
        });

        test("can create a new entry type", async () => {

            // TODO
        });

    })
});
