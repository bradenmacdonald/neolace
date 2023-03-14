/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { C, GenericCypherAction, ValidationError, VNID } from "neolace/deps/vertex-framework.ts";

import {
    assert,
    assertEquals,
    assertInstanceOf,
    assertRejects,
    group,
    setTestIsolation,
    test,
} from "neolace/lib/tests.ts";
import { getGraph } from "neolace/core/graph.ts";
import { CreateSite } from "neolace/core/Site.ts";
import { CreateDraft } from "./Draft-actions.ts";
import { CreateUser } from "../User.ts";
import { Draft } from "./Draft.ts";

group("Draft.ts", () => {
    group("low-level tests for Draft model", () => {
        setTestIsolation(setTestIsolation.levels.BLANK_ISOLATED);

        const setup = async () => {
            const graph = await getGraph();
            const user = await graph.runAsSystem(
                CreateUser({ id: VNID(), authnId: -1, email: "user@neolace.net", fullName: "Test User" }),
            );
            const { id: alphaSiteId } = await graph.runAsSystem(
                CreateSite({
                    name: "Test Site Alpha",
                    domain: "alpha.neolace.net",
                    key: "alpha",
                    adminUser: user.id,
                }),
            );
            const { id: betaSiteId } = await graph.runAsSystem(
                CreateSite({
                    name: "Test Site Beta",
                    domain: "beta.neolace.net",
                    key: "beta",
                    adminUser: user.id,
                }),
            );
            return { user, alphaSiteId, betaSiteId };
        };

        test("Drafts get unique, incrementing, site-specific identifiers", async () => {
            const graph = await getGraph();
            const { user, alphaSiteId, betaSiteId } = await setup();

            const draftA1 = await graph.runAsSystem(
                CreateDraft({ title: "Alpha Draft 1", siteId: alphaSiteId, authorId: user.id, edits: [] }),
            );
            const draftB1 = await graph.runAsSystem(
                CreateDraft({ title: "Beta Draft 1", siteId: betaSiteId, authorId: user.id, edits: [] }),
            );
            const draftA2 = await graph.runAsSystem(
                CreateDraft({ title: "Alpha Draft 2", siteId: alphaSiteId, authorId: user.id, edits: [] }),
            );
            const draftB2 = await graph.runAsSystem(
                CreateDraft({ title: "Beta Draft 2", siteId: betaSiteId, authorId: user.id, edits: [] }),
            );
            assertEquals(draftA1.num, 1);
            assertEquals(draftA2.num, 2);
            assertEquals(draftB1.num, 1);
            assertEquals(draftB2.num, 2);
        });

        test("Validation enforces that siteNamespace matches the draft's site", async () => {
            const graph = await getGraph();
            const { user, alphaSiteId, betaSiteId } = await setup();
            const draft = await graph.runAsSystem(
                CreateDraft({ title: "Alpha Draft 1", siteId: alphaSiteId, authorId: user.id, edits: [] }),
            );
            await assertRejects(
                () =>
                    graph.runAsSystem(
                        GenericCypherAction({
                            cypher: C`
                            MATCH (draft:${Draft} {id: ${draft.id}})
                            SET draft.siteNamespace = ${betaSiteId}
                            RETURN null
                        `,
                            modifiedNodes: [draft.id],
                            description: "Forcibly set the siteNamespace to a wrong value.",
                        }),
                    ),
                ValidationError,
                "Draft has incorrect siteNamespace.",
            );
        });

        test("Drafts cannot be created with the same num on the same site", async () => {
            const graph = await getGraph();
            const { user, alphaSiteId } = await setup();
            const draft1 = await graph.runAsSystem(
                CreateDraft({ title: "Alpha Draft 1", siteId: alphaSiteId, authorId: user.id, edits: [] }),
            );
            const draft2 = await graph.runAsSystem(
                CreateDraft({ title: "Alpha Draft 1", siteId: alphaSiteId, authorId: user.id, edits: [] }),
            );
            const err = await assertRejects(
                () =>
                    graph.runAsSystem(
                        GenericCypherAction({
                            cypher: C`
                            MATCH (draft1:${Draft} {id: ${draft1.id}})
                            MATCH (draft2:${Draft} {id: ${draft2.id}})
                            SET draft2.num = draft1.num
                            RETURN null
                        `,
                            modifiedNodes: [draft2.id],
                            description: "Forcibly set the num to conflict with an existing draft.",
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
