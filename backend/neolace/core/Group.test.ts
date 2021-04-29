import { suite, test, assert, beforeEach, setTestIsolation, assertRejects } from "../lib/intern-tests";
import { log } from "../api";
import { graph } from "./graph";
import { CreateGroup, Group, UpdateGroup } from "./Group";
import { CreateSite, Site } from "./Site";
import { UUID } from "vertex-framework";

suite(__filename, () => {

    suite("CreateGroup", () => {

        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);

        test(`Cannot create a group that doesn't belong to a site`, async () => {
            await assertRejects(
                graph.runAs(defaultData.users.alex.uuid, CreateGroup({
                    name: "Site-less group",
                    ...Group.emptyPermissions,
                })),
                "Required relationship type BELONGS_TO must point to one node, but does not exist.",
            );
        });

        test(`Can create nested groups up to ${Group.maxDepth} levels deep, but no more`, async () => {
            assert.equal(Group.maxDepth, 4);

            // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
            const getGroup = (key: string|UUID) => graph.pullOne(Group, g => g.uuid.name.parentGroup(pg => pg.uuid).site(s => s.uuid), {key,});

            // First check that there is a base users group (level 1, not a nested group)
            const usersGroup = await getGroup(defaultData.site.usersGroupUuid);
            assert.strictEqual(usersGroup.name, "Users");
            assert.strictEqual(usersGroup.site?.uuid, defaultData.site.uuid);
            assert.strictEqual(usersGroup.parentGroup, null);

            // Create a level 2 group:
            const level2group = await graph.runAs(defaultData.users.alex.uuid, CreateGroup({
                name: "Level 2 Users",
                belongsTo: usersGroup.uuid,
                ...Group.emptyPermissions,
            })).then(cr => getGroup(cr.uuid));
            assert.strictEqual(level2group.name, "Level 2 Users");
            assert.strictEqual(level2group.site?.uuid, defaultData.site.uuid);
            assert.strictEqual(level2group.parentGroup?.uuid, usersGroup.uuid);

            // Create a level 3 group:
            const level3group = await graph.runAs(defaultData.users.alex.uuid, CreateGroup({
                name: "Level 3 Users",
                belongsTo: level2group.uuid,
                ...Group.emptyPermissions,
            })).then(cr => getGroup(cr.uuid));
            assert.strictEqual(level3group.name, "Level 3 Users");
            assert.strictEqual(level3group.site?.uuid, defaultData.site.uuid);
            assert.strictEqual(level3group.parentGroup?.uuid, level2group.uuid);

            // Create a level 4 group:
            const level4group = await graph.runAs(defaultData.users.alex.uuid, CreateGroup({
                name: "Level 4 Users",
                belongsTo: level3group.uuid,
                ...Group.emptyPermissions,
            })).then(cr => getGroup(cr.uuid));
            assert.strictEqual(level4group.name, "Level 4 Users");
            assert.strictEqual(level4group.site?.uuid, defaultData.site.uuid);
            assert.strictEqual(level4group.parentGroup?.uuid, level3group.uuid);

            // Creating a level 5 group should fail though - too deep:
            await assertRejects(
                graph.runAs(defaultData.users.alex.uuid, CreateGroup({
                    name: "Level 5 Users",
                    belongsTo: level4group.uuid,
                    ...Group.emptyPermissions,
                })),
                "User groups cannot be nested more than 4 levels deep.",
            );
        });
    });

    suite("UpdateGroup", () => {

        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);

        test(`Cannot move a group from one site to another`, async () => {

            // Create a second site:
            const site2details = await graph.runAs(defaultData.users.alex.uuid, CreateSite({
                domain: "test2.neolace.com",
                shortId: "site-test2",
                adminUser: defaultData.users.alex.uuid,
            }));

            // Move the "users group" from the first/default site to the second site - this should not be allowed:
            await assertRejects(
                graph.runAs(defaultData.users.alex.uuid, UpdateGroup({
                    key: defaultData.site.usersGroupUuid,
                    belongsTo: site2details.uuid,
                })),
                "Cannot move Group from one site to another.",
            );

            // Also check that it rejects when moving to a group that's part of the second site:
            await assertRejects(
                graph.runAs(defaultData.users.alex.uuid, UpdateGroup({
                    key: defaultData.site.usersGroupUuid,
                    belongsTo: site2details.adminGroup,
                })),
                "Cannot move Group from one site to another.",
            );
        });

    });
});
