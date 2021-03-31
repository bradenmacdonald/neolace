import * as api from "neolace-api";
import { suite, test, assert, before, beforeEach, setTestIsolation, getClient } from "../../lib/intern-tests";

suite(__filename, () => {

    suite("Get information about my own account", () => {

        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);

        let alexClient: api.NeolaceApiClient;
        before(() => { alexClient = getClient(defaultData.users.alex); });

        test("can check who is logged in", async () => {

            const result = await alexClient.whoAmI();
            assert.deepStrictEqual(result, {
                isBot: true,
                fullName: defaultData.users.alex.bot.fullName,
                ownedByUsername: defaultData.users.alex.username,
                username: defaultData.users.alex.bot.username,
            });
        })
    })
});
