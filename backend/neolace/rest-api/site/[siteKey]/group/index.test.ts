/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import {
    assert,
    assertEquals,
    assertRejects,
    getClient,
    group,
    SDK,
    setTestIsolation,
    test,
} from "neolace/rest-api/tests.ts";
import { isVNID } from "neolace/deps/vertex-framework.ts";

group("list site groups", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);

    test("Admins can list the groups on a site", async () => {
        const client = await getClient(defaultData.users.admin, defaultData.site.key);

        const groups = await client.getSiteGroups();
        assertEquals(groups[0]?.name, "Administrators");
        assertEquals(groups[0]?.numUsers, 1);
        assert(isVNID(groups[0]?.id));

        assertEquals(groups[1]?.name, "Users");
        assertEquals(groups[1]?.numUsers, 1);
        assert(isVNID(groups[1]?.id));

        assertEquals(groups.length, 2);
    });

    test("Regular users cannot list the groups on a site", async () => {
        const client = await getClient(defaultData.users.regularUser, defaultData.site.key);

        await assertRejects(
            () => client.getSiteGroups(),
            SDK.NotAuthorized,
        );
    });

    test("Admins can create a new group on a site", async () => {
        const client = await getClient(defaultData.users.admin, defaultData.site.key);

        const beforeGroups = await client.getSiteGroups();
        assertEquals(beforeGroups.map((g) => g.name), ["Administrators", "Users"]);

        await client.createGroup({ name: "NewGroup", grantStrings: ["*"] });

        const afterGroups = await client.getSiteGroups();
        assertEquals(afterGroups.map((g) => g.name), ["Administrators", "NewGroup", "Users"]);
    });

    test("Admins can create a new sub-group on a site", async () => {
        const client = await getClient(defaultData.users.admin, defaultData.site.key);

        const beforeGroups = await client.getSiteGroups();
        assertEquals(beforeGroups.map((g) => g.name), ["Administrators", "Users"]);
        const adminsGroupId = beforeGroups[0].id;

        await client.createGroup({ name: "NewGroup", grantStrings: ["*"], parentGroupId: adminsGroupId });

        const afterGroups = await client.getSiteGroups();
        assertEquals(afterGroups.map((g) => g.name), ["Administrators", "NewGroup", "Users"]);
        assertEquals(afterGroups[1].name, "NewGroup");
        assertEquals(afterGroups[1].parentGroupId, adminsGroupId);
        assertEquals(afterGroups[1].numUsers, 0);
    });

    test("Regular users cannot create groups", async () => {
        const client = await getClient(defaultData.users.regularUser, defaultData.site.key);

        await assertRejects(
            () => client.createGroup({ name: "NewGroup", grantStrings: [] }),
            SDK.NotAuthorized,
        );
        await assertRejects(
            () => client.createGroup({ name: "NewGroup", grantStrings: ["*"] }),
            SDK.NotAuthorized,
        );
    });
});
