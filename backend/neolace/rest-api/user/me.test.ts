/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
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
