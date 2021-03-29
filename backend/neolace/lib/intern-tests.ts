/* istanbul ignore file */
import intern from "intern";
import {
    VertexTestDataSnapshot
} from "vertex-framework";
export { intern };

import { environment } from "../app/config";
import { log } from "../app/log";
import { shutdown } from "../app/shutdown";
import { Entry } from "../core/entry/Entry";
import { graph } from "../core/graph";

export const { suite, test, before, beforeEach, after, afterEach } = intern.getPlugin("interface.tdd");
export const { assert } = intern.getPlugin("chai");

export const assertRejects = async (what: Promise<any>, msg?: string): Promise<void> => {
    await what.then(() => {
        assert.fail(undefined, undefined, "Expected promise to reject, but it resolved.");
    }, err => {
        if (msg) {
            assert.throws(() => { throw err; }, msg);
        }
    });
}

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
        dataSnapshot = await graph.snapshotDataForTesting();
    } catch (err) {
        // No point in running the test suite if beforeRun failed, but we don't have any good way to bail :-/
        log.error(`Error during beforeRun: ${err}`);
        void graph.shutdown();
        process.exit(1);
    }

    // At this point, no data should exist in the database:
    const foo = await graph.pull(Entry, e => e.uuid, {});
    if (foo.length !== 0) {
        throw new Error("Unexpected data in database.");
    }
});

intern.on("afterRun", async () => {
    shutdown();
});

async function resetTestDbToSnapshot(): Promise<void> {
    try {
        if (dataSnapshot === undefined) {
            throw new Error("beforeRun did not complete - cannot isolate data.");
        }
        await graph.resetDBToSnapshot(dataSnapshot);
    } catch (err) {
        log.error(`Error during isolateTestWrites.afterEach: ${err}`);
        throw err;
    }
}