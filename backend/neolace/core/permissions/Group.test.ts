import { assertEquals, assertRejects, assertStrictEquals, group, setTestIsolation, test } from "neolace/lib/tests.ts";
import { getGraph } from "neolace/core/graph.ts";
import { CreateGroup, Group, GroupMaxDepth, UpdateGroup } from "neolace/core/permissions/Group.ts";
import { CreateSite } from "neolace/core/Site.ts";
import { VNID } from "neolace/deps/vertex-framework.ts";

group("Group.ts", () => {
    group("CreateGroup", () => {
        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);

        test(`Cannot create a group that doesn't belong to a site`, async () => {
            const graph = await getGraph();
            await assertRejects(
                () =>
                    graph.runAs(
                        defaultData.users.admin.id,
                        CreateGroup({ name: "Site-less group", grantStrings: [] }),
                    ),
                Error,
                "Required relationship type BELONGS_TO must point to one node, but does not exist.",
            );
        });

        test(`Can create nested groups up to ${GroupMaxDepth} levels deep, but no more`, async () => {
            const graph = await getGraph();
            assertEquals(GroupMaxDepth, 4);

            const getGroup = (key: VNID) =>
                graph.pullOne(Group, (g) => g.id.name.parentGroup((pg) => pg.id).site((s) => s.id), { key });

            // First check that there is a base users group (level 1, not a nested group)
            const usersGroup = await getGroup(defaultData.site.usersGroupId);
            assertStrictEquals(usersGroup.name, "Users");
            assertStrictEquals(usersGroup.site?.id, defaultData.site.id);
            assertStrictEquals(usersGroup.parentGroup, null);

            // Create a level 2 group:
            const level2group = await graph.runAs(
                defaultData.users.admin.id,
                CreateGroup({
                    name: "Level 2 Users",
                    belongsTo: usersGroup.id,
                    grantStrings: [],
                }),
            ).then((cr) => getGroup(cr.id));
            assertStrictEquals(level2group.name, "Level 2 Users");
            assertStrictEquals(level2group.site?.id, defaultData.site.id);
            assertStrictEquals(level2group.parentGroup?.id, usersGroup.id);

            // Create a level 3 group:
            const level3group = await graph.runAs(
                defaultData.users.admin.id,
                CreateGroup({
                    name: "Level 3 Users",
                    belongsTo: level2group.id,
                    grantStrings: [],
                }),
            ).then((cr) => getGroup(cr.id));
            assertStrictEquals(level3group.name, "Level 3 Users");
            assertStrictEquals(level3group.site?.id, defaultData.site.id);
            assertStrictEquals(level3group.parentGroup?.id, level2group.id);

            // Create a level 4 group:
            const level4group = await graph.runAs(
                defaultData.users.admin.id,
                CreateGroup({
                    name: "Level 4 Users",
                    belongsTo: level3group.id,
                    grantStrings: [],
                }),
            ).then((cr) => getGroup(cr.id));
            assertStrictEquals(level4group.name, "Level 4 Users");
            assertStrictEquals(level4group.site?.id, defaultData.site.id);
            assertStrictEquals(level4group.parentGroup?.id, level3group.id);

            // Creating a level 5 group should fail though - too deep:
            await assertRejects(
                () =>
                    graph.runAs(
                        defaultData.users.admin.id,
                        CreateGroup({
                            name: "Level 5 Users",
                            belongsTo: level4group.id,
                            grantStrings: [],
                        }),
                    ),
                Error,
                "User groups cannot be nested more than 4 levels deep.",
            );
        });
    });

    group("UpdateGroup", () => {
        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);

        test(`Cannot move a group from one site to another`, async () => {
            const graph = await getGraph();
            // Create a second site:
            const site2details = await graph.runAs(
                defaultData.users.admin.id,
                CreateSite({
                    name: "Test Site 2",
                    domain: "test2.neolace.com",
                    friendlyId: "test2",
                    adminUser: defaultData.users.admin.id,
                }),
            );

            // Move the "users group" from the first/default site to the second site - this should not be allowed:
            await assertRejects(
                () =>
                    graph.runAs(
                        defaultData.users.admin.id,
                        UpdateGroup({
                            id: defaultData.site.usersGroupId,
                            belongsTo: site2details.id,
                        }),
                    ),
                Error,
                "Cannot move Group from one site to another.",
            );

            // Also check that it rejects when moving to a group that's part of the second site:
            await assertRejects(
                () =>
                    graph.runAs(
                        defaultData.users.admin.id,
                        UpdateGroup({
                            id: defaultData.site.usersGroupId,
                            belongsTo: site2details.adminGroup,
                        }),
                    ),
                Error,
                "Cannot move Group from one site to another.",
            );
        });
    });
});
