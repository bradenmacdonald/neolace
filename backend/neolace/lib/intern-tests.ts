// For some reason, when running tests with intern, ts-node cannot find these typings files unless we load them this way:
/// <reference types="../typings/hapi__hapi" />

/* istanbul ignore file */
import intern from "intern";
import { NeolaceApiClient } from "neolace-api";
import {
    VertexTestDataSnapshot
} from "vertex-framework";
export { intern };
import fetch from "node-fetch";

import { config, environment } from "../app/config";
import { log } from "../app/log";
import { shutdown } from "../app/shutdown";
import { Entry } from "../core/entry/Entry";
import { graph } from "../core/graph";
import { serverPromise } from "../server";
import { installDefaultData } from "./intern-tests-default-data";

export const { suite, test, before, beforeEach, after, afterEach } = intern.getPlugin("interface.tdd");
export const { assert } = intern.getPlugin("chai");

export const assertRejects = async (what: Promise<any>, msg?: string): Promise<any> => {
    let theError;
    await what.then(() => {
        assert.fail(undefined, undefined, "Expected promise to reject, but it resolved.");
    }, err => {
        if (msg) {
            assert.throws(() => { throw err; }, msg);
        }
        theError = err;
    });
    return theError;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export const assertRejectsWith = async (what: Promise<any>, errorClass: Function, msg?: string): Promise<void> => {
    await what.then(() => {
        assert.fail(undefined, undefined, "Expected promise to reject, but it resolved.");
    }, err => {
        if (msg) {
            assert.throws(() => { throw err; }, errorClass, msg);
        }
    });
}

let emptySnapshot: VertexTestDataSnapshot;
let dataSnapshot: VertexTestDataSnapshot;

intern.on("beforeRun", async () => {
    try {
        if (environment !== "test") {
            throw new Error(`Test suite can only run when NODE_ENV is set to "test".`);
        }
        // Wipe out all existing Neo4j data
        await graph.reverseAllMigrations();
        // Apply pending migrations
        await graph.runMigrations();
        // Take a snapshot, for test isolation
        emptySnapshot = await graph.snapshotDataForTesting();

        // At this point, no data should exist in the database:
        const foo = await graph.pull(Entry, e => e.uuid, {});
        if (foo.length !== 0) {
            throw new Error("Unexpected data in database.");
        }

        // Now install the default data shared by many test cases:
        await installDefaultData();
        dataSnapshot = await graph.snapshotDataForTesting();

        // Now make sure the server is running:
        await serverPromise;
    } catch (err) {
        // No point in running the test suite if beforeRun failed, but we don't have any good way to bail :-/
        log.error(`Error during beforeRun: ${err}`);
        void graph.shutdown();
        process.exit(1);
    }
});

intern.on("afterRun", async () => {
    shutdown();
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

const defaultData = installDefaultData.data;

export function setTestIsolation(level: TestIsolationLevels): typeof defaultData {
    try {
        if (level === TestIsolationLevels.BLANK_NO_ISOLATION) {
            before(async () => { await graph.resetDBToSnapshot(emptySnapshot); });
        } else if (level === TestIsolationLevels.BLANK_ISOLATED) {
            beforeEach(async () => { await graph.resetDBToSnapshot(emptySnapshot); });
        } else if (level === TestIsolationLevels.DEFAULT_NO_ISOLATION) {
            before(async () => { await graph.resetDBToSnapshot(dataSnapshot); });
        } else if (level === TestIsolationLevels.DEFAULT_ISOLATED) {
            beforeEach(async () => { await graph.resetDBToSnapshot(dataSnapshot); });
        }
    } catch (err) {
        log.error(`Error during setTestIsolation: ${err}`);
        throw err;
    }
    return defaultData;
}
setTestIsolation.levels = TestIsolationLevels;

/**
 * Get an instance of the API client, to use for testing.
 * @param user One of the default users, 
 * @returns 
 */
export function getClient(user?: {bot: {authToken: string}}): NeolaceApiClient {

    if (!defaultData.wasCreated) {
        throw new Error("Shared test data wasn't created yet.");
    }

    return new NeolaceApiClient({
        basePath: config.apiUrl,
        fetchApi: fetch,
        authToken: user?.bot.authToken,
    });
}
