import * as log from "std/log/mod.ts";
import { VNID } from "neolace/deps/vertex-framework.ts";

import { environment } from "neolace/app/config.ts";
import { shutdown } from "neolace/app/shutdown.ts";
import { graph } from "neolace/core/graph.ts";
import { CreateGroup, PermissionGrant } from "neolace/core/Group.ts";
import { CreateBot, CreateUser } from "neolace/core/User.ts";
import {
    fixRelationshipIdsAfterRestoringSnapshot,
    testDataFile,
    TestSetupData,
} from "neolace/lib/tests-default-data.ts";

import {
    afterAll,
    afterEach,
    beforeAll,
    beforeEach,
    group as baseGroup,
    test as baseTest,
} from "neolace/deps/hooked.ts";

// Exports:
export * from "std/testing/asserts.ts";
export { afterAll, afterEach, beforeAll, beforeEach };

/**
 * Helper to create a nice name for the base test group in a test suite file.
 *
 * Usage:
 *     group(import.meta, () => {
 *         group("UUIDv4", () => {
 *             test("parse and format a UUIDv4", () => {
 *                 // test code
 *
 * @param nameOrImportMeta A custom name for this group, or `import.meta` to auto-generate the name from the filename
 */
export function group(nameOrImportMeta: { url: string } | string, tests: () => unknown) {
    if (typeof nameOrImportMeta === "string") {
        return baseGroup(nameOrImportMeta, tests);
    }
    const url = nameOrImportMeta.url;
    const idx = url.indexOf("/neolace/");
    if (idx === -1) {
        return baseGroup(url, tests);
    }
    return baseGroup(url.substr(idx + 1), tests);
}

// Override the test() function to disable the ops/resources sanitizers by default, as our beforeTest/afterTest code
// interferes with them.
function badArgs(): never {
    throw new Error("Invalid test definition");
}
export function test(t: Deno.TestDefinition): void;
export function test(name: string, fn: () => void | Promise<void>): void;
export function test(
    t: Deno.TestDefinition | string,
    testFn?: () => void | Promise<void>,
): void {
    // Extract args
    const { name, fn, ...opts } = typeof t === "object"
        ? t
        : (typeof testFn !== "undefined" ? { name: t, fn: testFn } : badArgs());
    opts.sanitizeOps = false;
    opts.sanitizeResources = false;
    return baseTest({ name, fn, ...opts });
}

let dataStr: string;
try {
    dataStr = await Deno.readTextFile(testDataFile);
} catch (err) {
    log.error(err);
    log.info(
        "Please run 'ENV_TYPE=test deno run --import-map=import_map.json --allow-write --allow-net --allow-env neolace/scripts/test-setup.ts'",
    );
    Deno.exit(1);
}
const { emptySnapshot, defaultDataSnapshot, data } = JSON.parse(dataStr) as TestSetupData;

if (environment !== "test") {
    // TODO: is there a way to auto-detect when we're run via 'deno test'?
    log.error("Please run tests using ENV_TYPE=test");
    Deno.exit(1);
}

afterAll(async () => {
    // Leave the data in the database from whatever test ran last, which is helpful for debugging.
    await shutdown();
});

enum TestIsolationLevels {
    /**
     * The database will be empty (no data at all), and data created by one test in this suite will still be there
     * when the next test runs. This is the fastest option.
     */
    BLANK_NO_ISOLATION,
    /**
     * The database will be empty (no data at all), and reset between every tests, so the tests are fully isolated.
     */
    BLANK_ISOLATED,
    /**
     * The database will have the "default data", and data created by one test in this suite will still be there
     * when the next test runs.
     */
    DEFAULT_NO_ISOLATION,
    /**
     * The database will have the "default data", and reset between every tests, so the tests are fully isolated.
     */
    DEFAULT_ISOLATED,
}

type ReturnedData<T extends TestIsolationLevels> = T extends TestIsolationLevels.DEFAULT_ISOLATED ? typeof data
    : T extends TestIsolationLevels.DEFAULT_NO_ISOLATION ? typeof data
    : void;

export async function resetDBToBlankSnapshot() {
    await graph.resetDBToSnapshot(emptySnapshot);
}

export async function resetDBToPlantDBSnapshot() {
    await graph.resetDBToSnapshot(defaultDataSnapshot);
    // Unfortunately restoring the snapshot does not restore relationship IDs, which
    // we rely on as the only way to uniquely identify relationships.
    // Fix those now using this hack:
    await fixRelationshipIdsAfterRestoringSnapshot();
}

export function setTestIsolation<Level extends TestIsolationLevels>(level: Level): ReturnedData<Level> {
    try {
        if (level === TestIsolationLevels.BLANK_NO_ISOLATION) {
            beforeAll(async () => {
                await resetDBToBlankSnapshot();
            });
        } else if (level === TestIsolationLevels.BLANK_ISOLATED) {
            beforeEach(async () => {
                await resetDBToBlankSnapshot();
            });
        } else if (level === TestIsolationLevels.DEFAULT_NO_ISOLATION) {
            beforeAll(async () => {
                await resetDBToPlantDBSnapshot();
            });
            // deno-lint-ignore no-explicit-any
            return data as any;
        } else if (level === TestIsolationLevels.DEFAULT_ISOLATED) {
            beforeEach(async () => {
                await resetDBToPlantDBSnapshot();
            });
            // deno-lint-ignore no-explicit-any
            return data as any;
        }
        // deno-lint-ignore no-explicit-any
        return undefined as any;
    } catch (err) {
        log.error(`Error during setTestIsolation: ${err}`);
        throw err;
    }
}
setTestIsolation.levels = TestIsolationLevels;

let _userCounter = 0; // A counter used by createUserWithPermissions
/**
 * Helper function to create a new user that has exactly the specified permissions, for test purposes.
 * @param permissions
 */
export async function createUserWithPermissions(
    permissions: Set<PermissionGrant>,
): Promise<{ userId: VNID; groupId: VNID; userData: { bot: { authToken: string } } }> {
    const userNumber = ++_userCounter;
    const username = `user${userNumber}`;

    const { id: userId } = await graph.runAsSystem(CreateUser({
        email: `${username}@example.com`,
        fullName: `User${userNumber} Tester`,
        username,
    }));

    const { authToken: botAuthToken } = await graph.runAsSystem(CreateBot({
        ownedByUser: userId,
        username: `user${userNumber}bot`,
        fullName: `User${userNumber} Tester's Bot`,
        inheritPermissions: true,
    }));

    const { id: groupId } = await graph.runAsSystem(CreateGroup({
        name: `TestGroup${userNumber}`,
        belongsTo: data.site.id,
        addUsers: [userId],
        administerSite: permissions.has(PermissionGrant.administerSite),
        administerGroups: permissions.has(PermissionGrant.administerGroups),
        approveEntryEdits: permissions.has(PermissionGrant.approveEntryEdits),
        approveSchemaChanges: permissions.has(PermissionGrant.approveSchemaChanges),
        proposeEntryEdits: permissions.has(PermissionGrant.proposeEntryEdits),
        proposeSchemaChanges: permissions.has(PermissionGrant.proposeSchemaChanges),
    }));

    return { userId, groupId, userData: { bot: { authToken: botAuthToken } } };
}
