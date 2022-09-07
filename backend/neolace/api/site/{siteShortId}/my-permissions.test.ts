import { api, assertEquals, getClient, group, setTestIsolation, test } from "neolace/api/tests.ts";
import { CreateBot } from "neolace/core/User.ts";
import { getGraph } from "neolace/api/mod.ts";

group("my-permissions.ts", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);

    test("It can get the permissions of an anonymous user", async () => {
        //const client = await getClient(defaultData.users.admin, defaultData.site.shortId);
        const client = await getClient(undefined, defaultData.site.shortId);

        const result = await client.getMyPermissions();

        assertEquals(result[api.CorePerm.viewSite], { hasPerm: true });
        assertEquals(result[api.CorePerm.proposeNewEntry], { hasPerm: false });
        assertEquals(result[api.CorePerm.siteAdmin], { hasPerm: false });
        // We don't expect data about "can view entry" because it requires that a specific entry ID is specified:
        assertEquals(result[api.CorePerm.viewEntry], undefined);
    });

    test("It can get the permissions of a regular user", async () => {
        const graph = await getGraph();
        const regularUserBot = await graph.runAsSystem(CreateBot({
            ownedByUser: defaultData.users.regularUser.id,
            username: "regularBot",
            fullName: "Regular User's Bot",
            inheritPermissions: true,
        }));
        const client = await getClient({ bot: { authToken: regularUserBot.authToken } }, defaultData.site.shortId);

        const result = await client.getMyPermissions();

        assertEquals(result[api.CorePerm.viewSite], { hasPerm: true });
        assertEquals(result[api.CorePerm.proposeNewEntry], { hasPerm: true });
        assertEquals(result[api.CorePerm.siteAdmin], { hasPerm: false });
        // We don't expect data about "can view entry" because it requires that a specific entry ID is specified:
        assertEquals(result[api.CorePerm.viewEntry], undefined);
    });

    test("It can get the permissions of an admin user", async () => {
        const client = await getClient(defaultData.users.admin, defaultData.site.shortId);

        const result = await client.getMyPermissions();

        assertEquals(result[api.CorePerm.viewSite], { hasPerm: true });
        assertEquals(result[api.CorePerm.proposeNewEntry], { hasPerm: true });
        assertEquals(result[api.CorePerm.siteAdmin], { hasPerm: true });
        // We don't expect data about "can view entry" because it requires that a specific entry ID is specified:
        assertEquals(result[api.CorePerm.viewEntry], undefined);
    });
});
