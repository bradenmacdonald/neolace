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

group("my-permissions.ts", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);

    test("It can get the permissions of an anonymous user", async () => {
        //const client = await getClient(defaultData.users.admin, defaultData.site.key);
        const client = await getClient(undefined, defaultData.site.key);

        const result = await client.getMyPermissions();

        assertEquals(result[SDK.CorePerm.viewSite], { hasPerm: true });
        assertEquals(result[SDK.CorePerm.proposeNewEntry], { hasPerm: false });
        assertEquals(result[SDK.CorePerm.siteAdmin], { hasPerm: false });
        // We don't expect data about "can view entry" because it requires that a specific entry ID is specified:
        assertEquals(result[SDK.CorePerm.viewEntry], undefined);
    });

    test("It can get the permissions of a regular user", async () => {
        const client = await getClient(defaultData.users.regularUser, defaultData.site.key);

        const result = await client.getMyPermissions();

        assertEquals(result[SDK.CorePerm.viewSite], { hasPerm: true });
        assertEquals(result[SDK.CorePerm.proposeNewEntry], { hasPerm: true });
        assertEquals(result[SDK.CorePerm.siteAdmin], { hasPerm: false });
        // We don't expect data about "can view entry" because it requires that a specific entry ID is specified:
        assertEquals(result[SDK.CorePerm.viewEntry], undefined);
    });

    test("It can get the permissions of an admin user", async () => {
        const client = await getClient(defaultData.users.admin, defaultData.site.key);

        const result = await client.getMyPermissions();

        assertEquals(result[SDK.CorePerm.viewSite], { hasPerm: true });
        assertEquals(result[SDK.CorePerm.proposeNewEntry], { hasPerm: true });
        assertEquals(result[SDK.CorePerm.siteAdmin], { hasPerm: true });
        // We don't expect data about "can view entry" because it requires that a specific entry ID is specified:
        assertEquals(result[SDK.CorePerm.viewEntry], undefined);
    });

    const max = 40;
    test(`It can get the permissions of an admin user in less than ${max}ms`, async () => {
        const client = await getClient(defaultData.users.admin, defaultData.site.key);

        // Run a couple times to warm up the caches:
        await client.getMyPermissions();
        await client.getMyPermissions();
        // Then time it:
        const before = performance.now();
        const result = await client.getMyPermissions();
        const after = performance.now();
        const took = after - before;

        assert(took < max, `Expected getMyPermissions() to take < ${max}ms, but it took ${took}ms`);

        assertEquals(result[SDK.CorePerm.viewSite], { hasPerm: true });
        assertEquals(result[SDK.CorePerm.proposeNewEntry], { hasPerm: true });
        assertEquals(result[SDK.CorePerm.siteAdmin], { hasPerm: true });
    });

    test("It can get the permissions of a specific draft", async () => {
        const site1key = defaultData.site.key;
        const site2key = defaultData.otherSite.key;
        const adminClient = await getClient(defaultData.users.admin, defaultData.site.key);
        const regClient = await getClient(defaultData.users.regularUser, defaultData.site.key);

        const draftA = await regClient.createDraft({
            title: "Draft A",
            description: "A draft by the regular user on site 1",
            edits: [{ code: "CreateEntryType", data: { key: "new-et", name: "New ET" } }],
        }, { siteKey: site1key });

        const draftB = await adminClient.createDraft({
            title: "Draft B",
            description: "A draft by the admin user on site 2",
            edits: [{ code: "CreateEntryType", data: { key: "new-et", name: "New ET" } }],
        }, { siteKey: site2key });

        // Now if the regular user asks about draft A, they should be able to edit it, because they created it:
        await regClient.getMyPermissions({ draftNum: draftA.num, siteKey: site1key }).then((result) => {
            assertEquals(result[SDK.CorePerm.editDraft], { hasPerm: true });
        });
        // And if the admin user asks about draft A, they should also be able to edit it since they have superuser powers:
        await adminClient.getMyPermissions({ draftNum: draftA.num, siteKey: site1key }).then((result) => {
            assertEquals(result[SDK.CorePerm.editDraft], { hasPerm: true });
        });

        // But if the regular user asks about draft B, they should NOT be able to edit it, because they didn't create it:
        await regClient.getMyPermissions({ draftNum: draftB.num, siteKey: site2key }).then((result) => {
            assertEquals(result[SDK.CorePerm.editDraft], { hasPerm: false });
        });
        // And if the admin user asks about draft B, they should be able to edit it since they created it:
        await adminClient.getMyPermissions({ draftNum: draftB.num, siteKey: site2key }).then((result) => {
            assertEquals(result[SDK.CorePerm.editDraft], { hasPerm: true });
        });
    });

    test("It gives a 404 if asking about permissions of a non-existed draft.", async () => {
        const client = await getClient(defaultData.users.admin, defaultData.site.key);

        await assertRejects(
            () => client.getMyPermissions({ draftNum: 12345678 }),
            SDK.NotFound,
            "Invalid draft number.",
        );
    });
});
