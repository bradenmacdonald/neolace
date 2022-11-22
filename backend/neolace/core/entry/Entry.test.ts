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
import { Entry } from "./Entry.ts";
import { ApplyEdits, UseSystemSource } from "../edit/ApplyEdits.ts";

group("Entry.ts", () => {
    // Note: Entry is tested throughout the whole test suite, but we have some specific low-level tests for the Entry
    // model and its validation here in this file.

    group("low-level tests for Entry model", () => {
        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);

        const getEntry = async (siteId: VNID, friendlyId: string) => {
            const graph = await getGraph();
            return await graph.pullOne(Entry, (e) => e.id.name.friendlyId, {
                with: { siteNamespace: siteId, friendlyId },
            });
        };

        test("The friendlyId of an entry is a site-specific identifier", async () => {
            const graph = await getGraph();
            const friendlyId = defaultData.entries.ponderosaPine.friendlyId;

            assertEquals((await getEntry(defaultData.site.id, friendlyId)).name, "Ponderosa Pine");

            // Now, create an entry on another site but with the same friendlyId:
            const otherEntryTypeId = VNID();
            await graph.runAsSystem(
                ApplyEdits({
                    editSource: UseSystemSource,
                    siteId: defaultData.otherSite.id,
                    edits: [
                        {
                            code: "CreateEntryType",
                            data: { id: otherEntryTypeId, name: "Other Entry Type" },
                        },
                        {
                            code: "CreateEntry",
                            data: {
                                friendlyId,
                                entryId: VNID(),
                                description: "This has the same friendly ID (s-ponderosa-pine) but is on another site.",
                                name: "Other Entry",
                                type: otherEntryTypeId,
                            },
                        },
                    ],
                }),
            );

            // Now make sure they are different:
            const onDefaultSite = await getEntry(defaultData.site.id, friendlyId);
            const onOtherSite = await getEntry(defaultData.otherSite.id, friendlyId);
            assertEquals(onDefaultSite.name, "Ponderosa Pine");
            assertEquals(onOtherSite.name, "Other Entry");
            assertEquals(onDefaultSite.friendlyId, friendlyId);
            assertEquals(onOtherSite.friendlyId, friendlyId);
        });

        test("Validation enforces that siteNamespace matches the entry's site", async () => {
            const graph = await getGraph();
            await assertRejects(
                () =>
                    graph.runAsSystem(
                        GenericCypherAction({
                            cypher: C`
                            MATCH (entry:${Entry} {id: ${defaultData.entries.ponderosaPine.id}})
                            SET entry.siteNamespace = ${defaultData.otherSite.id}
                            RETURN null
                        `,
                            modifiedNodes: [defaultData.entries.ponderosaPine.id],
                            description: "Forcibly set the siteNamespace to a wrong value.",
                        }),
                    ),
                ValidationError,
                "Entry has incorrect siteNamespace.",
            );
        });

        test("Entries cannot be created with the same friendlyId on the same site", async () => {
            const graph = await getGraph();
            const err = await assertRejects(
                () =>
                    graph.runAsSystem(
                        GenericCypherAction({
                            cypher: C`
                            MATCH (entry1:${Entry} {id: ${defaultData.entries.ponderosaPine.id}})
                            MATCH (entry2:${Entry} {id: ${defaultData.entries.jackPine.id}})
                            SET entry2.friendlyId = entry1.friendlyId
                            RETURN null
                        `,
                            modifiedNodes: [defaultData.entries.jackPine.id],
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
