import * as api from "neolace/deps/neolace-api.ts";
import { NotAuthenticated } from "neolace/deps/neolace-api.ts";
import { suite, test, assert, before, beforeEach, setTestIsolation, getClient, assertRejectsWith } from "../../lib/intern-tests";

suite(__filename, () => {

    suite("Get information about my own account", () => {

        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);

        test("can check who is logged in", async () => {

            // Get an API client, logged in as a bot that belongs to Alex
            const client = getClient(defaultData.users.admin);
            const result = await client.whoAmI();
            assert.deepStrictEqual(result, {
                isBot: true,
                fullName: defaultData.users.admin.bot.fullName,
                ownedByUsername: defaultData.users.admin.username,
                username: defaultData.users.admin.bot.username,
            });
        });

        test("can report when not logged in", async () => {

            // Get an API client, not logged in
            const client = getClient();

            await assertRejectsWith(
                client.whoAmI(),
                NotAuthenticated,
            );
        });
    })
});
