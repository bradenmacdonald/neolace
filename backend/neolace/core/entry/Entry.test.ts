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

        const getEntry = async (siteId: VNID, key: string) => {
            const graph = await getGraph();
            return await graph.pullOne(Entry, (e) => e.id.name.key, {
                with: { siteNamespace: siteId, key },
            });
        };

        test("The key of an entry is a site-specific identifier", async () => {
            const graph = await getGraph();
            const key = defaultData.entries.ponderosaPine.key;

            assertEquals((await getEntry(defaultData.site.id, key)).name, "Ponderosa Pine");

            // Now, create an entry on another site but with the same key:
            const otherEntryTypeKey = "other-et";
            await graph.runAsSystem(
                ApplyEdits({
                    editSource: UseSystemSource,
                    siteId: defaultData.otherSite.id,
                    edits: [
                        {
                            code: "CreateEntryType",
                            data: { key: otherEntryTypeKey, name: "Other Entry Type" },
                        },
                        {
                            code: "CreateEntry",
                            data: {
                                key,
                                entryId: VNID(),
                                description: "This has the same key (s-ponderosa-pine) but is on another site.",
                                name: "Other Entry",
                                entryTypeKey: otherEntryTypeKey,
                            },
                        },
                    ],
                }),
            );

            // Now make sure they are different:
            const onDefaultSite = await getEntry(defaultData.site.id, key);
            const onOtherSite = await getEntry(defaultData.otherSite.id, key);
            assertEquals(onDefaultSite.name, "Ponderosa Pine");
            assertEquals(onOtherSite.name, "Other Entry");
            assertEquals(onDefaultSite.key, key);
            assertEquals(onOtherSite.key, key);
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

        test("Entries cannot be created with the same key on the same site", async () => {
            const graph = await getGraph();
            const err = await assertRejects(
                () =>
                    graph.runAsSystem(
                        GenericCypherAction({
                            cypher: C`
                            MATCH (entry1:${Entry} {id: ${defaultData.entries.ponderosaPine.id}})
                            MATCH (entry2:${Entry} {id: ${defaultData.entries.jackPine.id}})
                            SET entry2.key = entry1.key
                            RETURN null
                        `,
                            modifiedNodes: [defaultData.entries.jackPine.id],
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
