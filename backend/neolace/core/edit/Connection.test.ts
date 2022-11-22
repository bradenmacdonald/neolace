import { C, GenericCypherAction, ValidationError } from "neolace/deps/vertex-framework.ts";

import {
    assert,
    assertInstanceOf,
    assertNotEquals,
    assertRejects,
    group,
    setTestIsolation,
    test,
} from "neolace/lib/tests.ts";
import { getGraph } from "neolace/core/graph.ts";
import { Connection } from "./Connection.ts";
import { getConnection } from "./connections.ts";

group("Connection.ts", () => {
    // Note: Entry is tested throughout the whole test suite, but we have some specific low-level tests for the Entry
    // model and its validation here in this file.

    group("low-level tests for Connection model", () => {
        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);

        test("The friendlyId of a Connection is a site-specific identifier", async () => {
            // Create connections on two different sites with the same friendlyId:
            const friendlyId = "foo-cnxn";
            const c1 = await getConnection({ friendlyId, create: true, plugin: "test", siteId: defaultData.site.id });
            const c2 = await getConnection({
                friendlyId,
                create: true,
                plugin: "test",
                siteId: defaultData.otherSite.id,
            });

            assertNotEquals(c1.id, c2.id);
        });

        test("Validation enforces that siteNamespace matches the connection's site", async () => {
            const graph = await getGraph();
            const c1 = await getConnection({
                friendlyId: "test-cnxn",
                create: true,
                plugin: "test",
                siteId: defaultData.site.id,
            });
            await assertRejects(
                () =>
                    graph.runAsSystem(
                        GenericCypherAction({
                            cypher: C`
                            MATCH (conn:${Connection} {id: ${c1.id}})
                            SET conn.siteNamespace = ${defaultData.otherSite.id}
                            RETURN null
                        `,
                            modifiedNodes: [c1.id],
                            description: "Forcibly set the siteNamespace to a wrong value.",
                        }),
                    ),
                ValidationError,
                "Connection has incorrect siteNamespace.",
            );
        });

        test("Entries cannot be created with the same friendlyId on the same site", async () => {
            const graph = await getGraph();
            const c1 = await getConnection({
                friendlyId: "foo",
                create: true,
                plugin: "test",
                siteId: defaultData.site.id,
            });
            const c2 = await getConnection({
                friendlyId: "bar",
                create: true,
                plugin: "test",
                siteId: defaultData.site.id,
            });
            const err = await assertRejects(
                () =>
                    graph.runAsSystem(
                        GenericCypherAction({
                            cypher: C`
                            MATCH (c1:${Connection} {id: ${c1.id}})
                            MATCH (c2:${Connection} {id: ${c2.id}})
                            SET c2.friendlyId = c1.friendlyId
                            RETURN null
                        `,
                            modifiedNodes: [c2.id],
                            description: "Forcibly set the friendlyId to conflict with an existing entry.",
                        }),
                    ),
            );
            assertInstanceOf(err, Error);
            assert(err.message.includes("failed during apply()"));
            assertInstanceOf(err.cause, Error);
            assert(err.cause.message.includes("already exists"));
        });
    });
});
