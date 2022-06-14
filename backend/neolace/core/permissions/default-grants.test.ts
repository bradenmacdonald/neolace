import { C, Field, VNID } from "neolace/deps/vertex-framework.ts";
import { assertEquals, group, setTestIsolation, test } from "neolace/lib/tests.ts";
import { getGraph } from "neolace/core/graph.ts";
import { AccessMode, CreateSite } from "neolace/core/Site.ts";

import { hasPermissions, makeCypherCondition } from "./check.ts";
import { corePerm, PermissionName } from "./permissions.ts";

group("default-grants.ts", () => {
    setTestIsolation(setTestIsolation.levels.BLANK_ISOLATED);

    test("integration test of default grants, site access modes, and hasPermissions()", async () => {
        const graph = await getGraph();

        // Create some sites for testing:
        const { id: privateSite } = await graph.runAsSystem(CreateSite({
            domain: "private.example.com",
            name: "Private Site",
            slugId: "site-private", // TODO: this should be shortId: "private"
            accessMode: AccessMode.Private,
        }));

        const { id: publicSite } = await graph.runAsSystem(CreateSite({
            domain: "public.example.com",
            name: "Public Contributions Site",
            slugId: "site-public",
            accessMode: AccessMode.PublicContributions,
        }));

        const { id: readonlySite } = await graph.runAsSystem(CreateSite({
            domain: "readonly.example.com",
            name: "Read Only Site",
            slugId: "site-readonly",
            accessMode: AccessMode.PublicReadOnly,
        }));

        // Now check the permissions:

        const anonUserHasPerm = (siteId: VNID, perm: PermissionName) =>
            hasPermissions({ siteId, userId: undefined }, perm, {});

        // A user who is not logged in cannot view the private site, but can view the public sites:
        assertEquals(await anonUserHasPerm(privateSite, corePerm.viewSite.name), false);
        assertEquals(await anonUserHasPerm(publicSite, corePerm.viewSite.name), true);
        assertEquals(await anonUserHasPerm(readonlySite, corePerm.viewSite.name), true);

        // A user who is not logged in cannot view entries on the private site, but can view the public sites:
        assertEquals(await anonUserHasPerm(privateSite, corePerm.viewEntry.name), false);
        assertEquals(await anonUserHasPerm(publicSite, corePerm.viewEntry.name), true);
        assertEquals(await anonUserHasPerm(readonlySite, corePerm.viewEntry.name), true);

        // A user who is not logged in cannot view the schema of the private site, but can view the public sites' schemas:
        assertEquals(await anonUserHasPerm(privateSite, corePerm.viewSchema.name), false);
        assertEquals(await anonUserHasPerm(publicSite, corePerm.viewSchema.name), true);
        assertEquals(await anonUserHasPerm(readonlySite, corePerm.viewSchema.name), true);

        // A user who is not logged in cannot propose edits on any site:
        assertEquals(await anonUserHasPerm(privateSite, corePerm.proposeEditToEntry.name), false);
        assertEquals(await anonUserHasPerm(privateSite, corePerm.proposeEditToSchema.name), false);
        assertEquals(await anonUserHasPerm(publicSite, corePerm.proposeEditToEntry.name), false);
        assertEquals(await anonUserHasPerm(publicSite, corePerm.proposeEditToSchema.name), false);
        assertEquals(await anonUserHasPerm(readonlySite, corePerm.proposeEditToEntry.name), false);
        assertEquals(await anonUserHasPerm(readonlySite, corePerm.proposeEditToSchema.name), false);

        // And the cypher predicate version is the same:
        for (const siteId of [privateSite, publicSite, readonlySite]) {
            const subject = { siteId, userId: undefined };
            for (
                const perm of [
                    corePerm.viewSite.name,
                    corePerm.viewEntry.name,
                    corePerm.viewSchema.name,
                    corePerm.proposeEditToEntry.name,
                    corePerm.proposeEditToSchema.name,
                ]
            ) {
                const expected = await hasPermissions(subject, perm, {});
                const predicate = await makeCypherCondition(subject, perm, {}, []);
                const result = await graph.read((tx) =>
                    tx.queryOne(C`RETURN ${predicate} AS x`.givesShape({ x: Field.Boolean }))
                );
                assertEquals(result.x, expected);
            }
        }
    });
});
