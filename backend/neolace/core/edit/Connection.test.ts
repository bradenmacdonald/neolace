/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
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

        test("The key of a Connection is a site-specific identifier", async () => {
            // Create connections on two different sites with the same key:
            const key = "foo-cnxn";
            const c1 = await getConnection({ key, create: true, plugin: "test", siteId: defaultData.site.id });
            const c2 = await getConnection({
                key,
                create: true,
                plugin: "test",
                siteId: defaultData.otherSite.id,
            });

            assertNotEquals(c1.id, c2.id);
        });

        test("Validation enforces that siteNamespace matches the connection's site", async () => {
            const graph = await getGraph();
            const c1 = await getConnection({
                key: "test-cnxn",
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

        test("Entries cannot be created with the same key on the same site", async () => {
            const graph = await getGraph();
            const c1 = await getConnection({
                key: "foo",
                create: true,
                plugin: "test",
                siteId: defaultData.site.id,
            });
            const c2 = await getConnection({
                key: "bar",
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
                            SET c2.key = c1.key
                            RETURN null
                        `,
                            modifiedNodes: [c2.id],
                            description: "Forcibly set the key to conflict with an existing entry.",
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
