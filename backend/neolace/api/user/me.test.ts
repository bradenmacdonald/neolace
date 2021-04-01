import * as api from "neolace-api";
import { NotAuthenticated } from "neolace-api";
import { suite, test, assert, before, beforeEach, setTestIsolation, getClient, assertRejectsWith } from "../../lib/intern-tests";

suite(__filename, () => {

    suite("Get information about my own account", () => {

        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);

        test("can check who is logged in", async () => {

            // Get an API client, logged in as a bot that belongs to Alex
            const client = getClient(defaultData.users.alex);
            const result = await client.whoAmI();
            assert.deepStrictEqual(result, {
                isBot: true,
                fullName: defaultData.users.alex.bot.fullName,
                ownedByUsername: defaultData.users.alex.username,
                username: defaultData.users.alex.bot.username,
            });
        });

        test("can creport when not logged in", async () => {

            // Get an API client, not logged in
            const client = getClient();

            await assertRejectsWith(
                client.whoAmI(),
                NotAuthenticated,
            );
        });
    })
});
