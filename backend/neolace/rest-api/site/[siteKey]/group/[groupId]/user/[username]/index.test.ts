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

group("add/remove group members", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);
    const regularUser = defaultData.users.regularUser;

    async function getUserGroups(client: SDK.NeolaceApiClient, username: string): Promise<string[]> {
        const firstPageOfUsers = await client.getSiteUsers();
        const user = firstPageOfUsers.values.find((u) => u.username === username);
        return user?.groups?.map((g) => g.name) ?? [];
    }

    test("It can add group members", async () => {
        const client = await getClient(defaultData.users.admin, defaultData.site.key);
        const siteGroups = await client.getSiteGroups();
        const adminsGroup = siteGroups.find((g) => g.name === "Administrators");
        assert(adminsGroup !== undefined);

        const beforeGroups = await getUserGroups(client, regularUser.username);
        assertEquals(beforeGroups, ["Users"]);

        await client.addGroupMember(adminsGroup.id, regularUser.username);

        const afterGroups = await getUserGroups(client, regularUser.username);
        assertEquals(afterGroups.sort(), ["Administrators", "Users"]);
    });

    test("It can remove group members", async () => {
        const client = await getClient(defaultData.users.admin, defaultData.site.key);
        const siteGroups = await client.getSiteGroups();
        const usersGroup = siteGroups.find((g) => g.name === "Users");
        assert(usersGroup !== undefined);

        const beforeGroups = await getUserGroups(client, regularUser.username);
        assertEquals(beforeGroups, ["Users"]);

        await client.removeGroupMember(usersGroup.id, regularUser.username);

        const afterGroups = await getUserGroups(client, regularUser.username);
        assertEquals(afterGroups, []);
    });

    test("It is idempotent for removing and adding", async () => {
        const client = await getClient(defaultData.users.admin, defaultData.site.key);
        const siteGroups = await client.getSiteGroups();
        const usersGroup = siteGroups.find((g) => g.name === "Users");
        assert(usersGroup !== undefined);

        assertEquals(await getUserGroups(client, regularUser.username), ["Users"]);

        await client.removeGroupMember(usersGroup.id, regularUser.username);
        await client.removeGroupMember(usersGroup.id, regularUser.username);

        assertEquals(await getUserGroups(client, regularUser.username), []);

        await client.addGroupMember(usersGroup.id, regularUser.username);
        await client.addGroupMember(usersGroup.id, regularUser.username);

        assertEquals(await getUserGroups(client, regularUser.username), ["Users"]);
    });

    test("It cannot modify groups from a different site", async () => {
        const client = await getClient(defaultData.users.admin);
        // Get the group from the default site:
        const siteGroups = await client.getSiteGroups({ siteKey: defaultData.site.key });
        const usersGroup = siteGroups.find((g) => g.name === "Users");
        assert(usersGroup !== undefined);

        // But try modifying that group on "other Site":
        await assertRejects(
            () => client.addGroupMember(usersGroup.id, regularUser.username, { siteKey: defaultData.otherSite.key }),
            SDK.NotFound,
        );
        // But try modifying that group on "other Site":
        await assertRejects(
            () => client.removeGroupMember(usersGroup.id, regularUser.username, { siteKey: defaultData.otherSite.key }),
            SDK.NotFound,
        );
    });

    test("Only admins can change group membership", async () => {
        const adminClient = await getClient(defaultData.users.admin, defaultData.site.key);
        const client = await getClient(regularUser, defaultData.site.key);

        // To get the group ID, we need to be an admin:
        const siteGroups = await adminClient.getSiteGroups();
        const adminsGroup = siteGroups.find((g) => g.name === "Administrators");
        assert(adminsGroup !== undefined);

        // But even with that ID, a regular user can't modify groups:
        await assertRejects(
            () => client.addGroupMember(adminsGroup.id, regularUser.username),
            SDK.NotAuthorized,
        );
        await assertRejects(
            () => client.removeGroupMember(adminsGroup.id, regularUser.username),
            SDK.NotAuthorized,
        );
    });
});
