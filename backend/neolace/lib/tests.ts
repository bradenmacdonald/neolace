import * as log from "std/log/mod.ts";
import { VNID } from "neolace/deps/vertex-framework.ts";

import { shutdown } from "neolace/app/shutdown.ts";
import { graph } from "neolace/core/graph.ts";
import { CreateGroup, PermissionGrant } from "neolace/core/Group.ts";
import { CreateBot, CreateUser } from "neolace/core/User.ts";
import { testDataFile, TestSetupData } from "neolace/lib/tests-default-data.ts";

import {test as baseTest, group as baseGroup, afterAll, afterEach, beforeAll, beforeEach} from "neolace/deps/hooked.ts";

// Exports:
export * from "std/testing/asserts.ts";
export {
    afterAll,
    afterEach,
    beforeAll,
    beforeEach,
};


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
 export function group(nameOrImportMeta: {url: string}|string, tests: () => unknown) {
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
function badArgs(): never { throw new Error("Invalid test definition"); }
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
    return baseTest({name, fn, ...opts});
}



let dataStr: string;
try {
    dataStr = await Deno.readTextFile(testDataFile);
} catch (err) {
    log.error(err);
    log.info("Please run 'ENV_TYPE=test deno run --import-map=import_map.json --allow-write --allow-net --unstable --allow-env neolace/scripts/test-setup.ts'");
    Deno.exit(1);
}
const {emptySnapshot, defaultDataSnapshot, data} = JSON.parse(dataStr) as TestSetupData;

afterAll(async () => {
    // Leave the default data in the database in case developers want to make queries and play with it:
    await graph.resetDBToSnapshot(defaultDataSnapshot);
    await shutdown();
})

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

export function setTestIsolation(level: TestIsolationLevels): typeof data {
    try {
        if (level === TestIsolationLevels.BLANK_NO_ISOLATION) {
            beforeAll(async () => { await graph.resetDBToSnapshot(emptySnapshot); });
        } else if (level === TestIsolationLevels.BLANK_ISOLATED) {
            beforeEach(async () => { await graph.resetDBToSnapshot(emptySnapshot); });
        } else if (level === TestIsolationLevels.DEFAULT_NO_ISOLATION) {
            beforeAll(async () => { await graph.resetDBToSnapshot(defaultDataSnapshot); });
        } else if (level === TestIsolationLevels.DEFAULT_ISOLATED) {
            beforeEach(async () => { await graph.resetDBToSnapshot(defaultDataSnapshot); });
        }
    } catch (err) {
        log.error(`Error during setTestIsolation: ${err}`);
        throw err;
    }
    return data;
}
setTestIsolation.levels = TestIsolationLevels;



let _userCounter = 0;  // A counter used by createUserWithPermissions
/**
 * Helper function to create a new user that has exactly the specified permissions, for test purposes.
 * @param permissions 
 */
export async function createUserWithPermissions(permissions: Set<PermissionGrant>): Promise<{userId: VNID, groupId: VNID, userData: {bot: {authToken: string}}}> {

    const userNumber = ++_userCounter;
    const username = `user${userNumber}`;

    const {id: userId} = await graph.runAsSystem(CreateUser({
        email: `${username}@example.com`,
        fullName: `User${userNumber} Tester`,
        username,
    }));

    const {authToken: botAuthToken} = await graph.runAsSystem(CreateBot({
        ownedByUser: userId,
        username: `user${userNumber}bot`,
        fullName: `User${userNumber} Tester's Bot`,
        inheritPermissions: true,
    }));

    const {id: groupId} = await graph.runAsSystem(CreateGroup({
        name: `TestGroup${userNumber}`,
        belongsTo: data.site.id,
        addUsers: [userId],
        administerSite:       permissions.has(PermissionGrant.administerSite),
        administerGroups:     permissions.has(PermissionGrant.administerGroups),
        approveEntryEdits:    permissions.has(PermissionGrant.approveEntryEdits),
        approveSchemaChanges: permissions.has(PermissionGrant.approveSchemaChanges),
        proposeEntryEdits:    permissions.has(PermissionGrant.proposeEntryEdits),
        proposeSchemaChanges: permissions.has(PermissionGrant.proposeSchemaChanges),
    }));

    return {userId, groupId, userData: {bot: {authToken: botAuthToken}}};
}