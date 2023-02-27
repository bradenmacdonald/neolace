import { assertEquals, assertRejects, getClient, group, SDK, setTestIsolation, test } from "neolace/rest-api/tests.ts";

group("me.ts", () => {
    group("Get information about my own account", () => {
        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);

        test("can check who is logged in", async () => {
            // Get an API client, logged in as a bot that belongs to Alex
            const client = await getClient(defaultData.users.admin);
            const result = await client.whoAmI();
            assertEquals(result, {
                isBot: true,
                fullName: defaultData.users.admin.bot.fullName,
                ownedByUsername: defaultData.users.admin.username,
                username: defaultData.users.admin.bot.username,
            });
        });

        test("can report when not logged in", async () => {
            // Get an API client, not logged in
            const client = await getClient();

            await assertRejects(
                () => client.whoAmI(),
                SDK.NotAuthenticated,
            );
        });
    });
});
