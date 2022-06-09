import * as log from "std/log/mod.ts";
import { VNID } from "neolace/deps/vertex-framework.ts";

import { environment } from "neolace/app/config.ts";
import { getGraph, stopGraphDatabaseConnection } from "neolace/core/graph.ts";
import { stopRedis } from "neolace/core/redis.ts";
import { CreateGroup } from "neolace/core/permissions/Group.ts";
import { CreateBot, CreateUser } from "neolace/core/User.ts";
import {
    fixRelationshipIdsAfterRestoringSnapshot,
    testDataFile,
    TestSetupData,
} from "neolace/lib/tests-default-data.ts";
import { LookupExpression } from "neolace/core/lookup/expressions/base.ts";
import { ConcreteValue, ErrorValue, LookupValue } from "neolace/core/lookup/values.ts";
import { LookupContext } from "neolace/core/lookup/context.ts";

import { afterAll, afterEach, beforeAll, beforeEach, describe, it, ItDefinition } from "std/testing/bdd.ts";
import { PermissionGrant } from "../core/permissions/grant.ts";

// Exports:
export * from "std/testing/asserts.ts";
export { afterAll, afterEach, beforeAll, beforeEach };

let level = 0;
/**
 * Helper to group all of the tests in a file. Will clean up the database handle
 * after the tests are done, if needed, to avoid warnings about leaking websockets.
 */
export function group(name: string, tests: () => unknown) {
    if (level === 0) {
        describe(
            name,
            { sanitizeOps: false }, // TODO: leaving this enabled causes some occasional flaky sanitizer test failures. Is the Neo4j driver not properly closing the websocket every time?
            () => {
                afterAll(async () => {
                    await stopGraphDatabaseConnection();
                    await stopRedis();
                });
                level++;
                tests();
                level--;
            },
        );
    } else {
        describe(name, { sanitizeOps: false, sanitizeResources: false }, () => {
            level++;
            tests();
            level--;
        });
    }
}

// Override the test() function to disable the ops/resources sanitizers by default, as our beforeTest/afterTest code
// interferes with them.
function badArgs(): never {
    throw new Error("Invalid test definition");
}
// deno-lint-ignore no-explicit-any
export function test(t: ItDefinition<any>): void;
export function test(name: string, fn: () => void | Promise<void>): void;
export function test(
    // deno-lint-ignore no-explicit-any
    t: ItDefinition<any> | string,
    testFn?: () => void | Promise<void>,
): void {
    // Extract args
    const { name, fn, ...opts } = typeof t === "object"
        ? t
        : (typeof testFn !== "undefined" ? { name: t, fn: testFn } : badArgs());
    opts.sanitizeOps = false;
    opts.sanitizeResources = false;
    return it({ name, fn, ...opts });
}

let dataStr: string;
try {
    dataStr = await Deno.readTextFile(testDataFile);
} catch (err) {
    log.error(err);
    log.info(
        "Please run 'ENV_TYPE=test deno run --allow-write --allow-net --allow-env neolace/scripts/test-setup.ts'",
    );
    Deno.exit(1);
}
const { emptySnapshot, defaultDataSnapshot, data } = JSON.parse(dataStr) as TestSetupData;

if (environment !== "test") {
    // TODO: is there a way to auto-detect when we're run via 'deno test'?
    log.error("Please run tests using ENV_TYPE=test");
    Deno.exit(1);
}

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
    await (await getGraph()).resetDBToSnapshot(emptySnapshot);
}

export async function resetDBToPlantDBSnapshot() {
    await (await getGraph()).resetDBToSnapshot(defaultDataSnapshot);
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
    ...permissionGrants: PermissionGrant[]
): Promise<{ userId: VNID; groupId: VNID; userData: { bot: { authToken: string } } }> {
    const graph = await getGraph();
    const userNumber = ++_userCounter;
    const username = `user${userNumber}`;
    const userId = VNID();

    await graph.runAsSystem(CreateUser({
        id: userId,
        email: `${username}@example.com`,
        fullName: `User${userNumber} Tester`,
        username,
        authnId: -100 - userNumber, // We use negative numbers for fake authn IDs that aren't actually registered in the authn microservice.
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
        grantStrings: permissionGrants.map((pg) => pg.serialize()),
    }));

    return { userId, groupId, userData: { bot: { authToken: botAuthToken } } };
}

/**
 * A class that makes it easier to evaluate lookup expressions in a test context.
 */
export class TestLookupContext {
    public readonly siteId: VNID;
    /**
     * The "current entry", i.e. the value of "this" in any lookup expression in this context. May not be defined, in
     * cases like the home page which can have lookup expressions but aren't entries themselves.
     */
    public readonly entryId?: VNID;
    public readonly defaultPageSize?: bigint;

    constructor(args: {
        siteId: VNID;
        entryId?: VNID;
        defaultPageSize?: bigint;
    }) {
        this.siteId = args.siteId;
        this.entryId = args.entryId;
        this.defaultPageSize = args.defaultPageSize;
    }

    /**
     * Evaluate a lookup expression.
     * This may return "Lazy" values depending on the expression, which you may not want for test purposes. Use
     * evaluateExprConcrete() in that case to get concete values only.
     */
    public async evaluateExpr(expr: LookupExpression | string, entryId?: VNID): Promise<LookupValue> {
        const graph = await getGraph();
        const result = await graph.read(async (tx) => {
            const tempContext = new LookupContext({
                tx,
                siteId: this.siteId,
                entryId: entryId ?? this.entryId,
                defaultPageSize: this.defaultPageSize,
            });
            return await tempContext.evaluateExpr(expr);
        });
        if (result instanceof ErrorValue) {
            throw result.error;
        }
        return result;
    }

    /**
     * Evaluate an expression as a "Concrete" value, which excludes any of the "Lazy" value types and forces them to be
     * evaluated. For example, instead of returning a LazyEntrySet representing a yet-unknown set of entries, it will
     * evaluate the query, determine which actual entries are included, and return the first 10 as a PageValue.
     */
    public async evaluateExprConcrete(expr: LookupExpression | string, entryId?: VNID): Promise<ConcreteValue> {
        // We can't just call evaluateExpr() and then .makeConcrete() because makeConcrete() requires the same
        // transaction, and the transaction gets closed within evaluateExpr().
        const graph = await getGraph();
        const result = await graph.read(async (tx) => {
            const tempContext = new LookupContext({
                tx,
                siteId: this.siteId,
                entryId: entryId ?? this.entryId,
                defaultPageSize: this.defaultPageSize,
            });
            const innerResult = await tempContext.evaluateExpr(expr);
            return await innerResult.makeConcrete();
        });
        if (result instanceof ErrorValue) {
            throw result.error;
        }
        return result;
    }
}
