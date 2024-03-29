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
import { getGraph } from "neolace/rest-api/mod.ts";
import { CreateBot } from "neolace/core/User.ts";
import { UpdateGroup } from "neolace/core/permissions/Group.ts";

group("index.ts", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);

    const adminUserExpected = {
        fullName: defaultData.users.admin.fullName,
        username: defaultData.users.admin.username,
        groups: [
            { id: defaultData.site.adminsGroupId, name: "Administrators" },
        ],
        isBot: false,
    };
    const adminBotExpected = {
        fullName: defaultData.users.admin.bot.fullName,
        username: defaultData.users.admin.bot.username,
        groups: [
            { id: defaultData.site.adminsGroupId, name: "Administrators" },
        ],
        isBot: true,
        ownedBy: {
            username: defaultData.users.admin.username,
            fullName: defaultData.users.admin.fullName,
        },
    };
    const regularUserExpected = {
        fullName: defaultData.users.regularUser.fullName,
        username: defaultData.users.regularUser.username,
        groups: [
            { id: defaultData.site.usersGroupId, name: "Users" },
        ],
        isBot: false,
    };
    const regularUserBotExpected = {
        fullName: defaultData.users.regularUser.bot.fullName,
        username: defaultData.users.regularUser.bot.username,
        groups: [
            { id: defaultData.site.usersGroupId, name: "Users" },
        ],
        isBot: true,
        ownedBy: {
            username: defaultData.users.regularUser.username,
            fullName: defaultData.users.regularUser.fullName,
        },
    };

    test("An administrator with permissions can get a list of users associated with a site", async () => {
        const client = await getClient(defaultData.users.admin, defaultData.site.key);

        const result = await client.getSiteUsers();

        assertEquals(result.values, [
            adminUserExpected,
            adminBotExpected,
            regularUserExpected,
            regularUserBotExpected,
        ]);
        assertEquals(result.totalCount, result.values.length);
    });

    test("Bots are listed only if they have 'inheritPermissions' from their owner user OR they are explicitly added to a Group", async () => {
        const graph = await getGraph();

        // TODO: this should be an API call to create the bot, not an action.
        const _inheritingBot = await graph.runAsSystem(CreateBot({
            ownedByUser: defaultData.users.regularUser.id,
            username: "inheritingBot",
            fullName: "Inheriting Bot",
            inheritPermissions: true,
        }));
        const explicitlyAddedBot = await graph.runAsSystem(CreateBot({
            ownedByUser: defaultData.users.regularUser.id,
            username: "addedBot",
            fullName: "Added Explicitly Bot",
            inheritPermissions: false,
        }));
        const _notAddedBot = await graph.runAsSystem(CreateBot({
            ownedByUser: defaultData.users.regularUser.id,
            username: "notAddedBot",
            fullName: "Not Added Bot",
            inheritPermissions: false,
        }));
        // The "explicitlyAddedBot" gets added to the site's user group:
        await graph.runAsSystem(UpdateGroup({
            id: defaultData.site.usersGroupId,
            addUsers: [explicitlyAddedBot.id],
        }));

        const client = await getClient(defaultData.users.admin, defaultData.site.key);

        const result = await client.getSiteUsers();

        assertEquals(result.values, [
            {
                fullName: "Added Explicitly Bot",
                username: "addedBot",
                groups: [{ id: defaultData.site.usersGroupId, name: "Users" }],
                isBot: true,
                ownedBy: {
                    username: defaultData.users.regularUser.username,
                    fullName: defaultData.users.regularUser.fullName,
                },
            },
            adminUserExpected,
            adminBotExpected,
            {
                fullName: "Inheriting Bot",
                username: "inheritingBot",
                groups: [{ id: defaultData.site.usersGroupId, name: "Users" }],
                isBot: true,
                ownedBy: {
                    username: defaultData.users.regularUser.username,
                    fullName: defaultData.users.regularUser.fullName,
                },
            },
            regularUserExpected,
            regularUserBotExpected,
        ]);
        assertEquals(result.totalCount, result.values.length);

        // Note that _notAddedBot does NOT appear in the list of site users, because it neither inherits permissions
        // nor is added to a group.
    });

    test("A user without permissions can NOT get a list of users associated with a site", async () => {
        const client = await getClient(defaultData.users.regularUser, defaultData.site.key);

        await assertRejects(
            () => client.getSiteUsers(),
            SDK.NotAuthorized,
        );
    });
});
