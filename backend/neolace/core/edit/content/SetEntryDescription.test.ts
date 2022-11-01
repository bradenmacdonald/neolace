import {
    assertEquals,
    assertInstanceOf,
    assertRejects,
    group,
    setTestIsolation,
    test,
    TestLookupContext,
} from "neolace/lib/tests.ts";
import { getGraph } from "neolace/core/graph.ts";
import { ApplyEdits } from "neolace/core/edit/ApplyEdits.ts";
import { StringValue } from "neolace/core/lookup/values.ts";
import { InvalidEdit, VNID } from "neolace/deps/neolace-api.ts";

group("SetEntryDescription edit implementation", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);
    const siteId = defaultData.site.id;
    const ponderosaPine = defaultData.entries.ponderosaPine;
    const context = new TestLookupContext({ siteId });
    const getFriendlyId = () =>
        context.evaluateExprConcrete(`entry("${ponderosaPine.id}").description`).then((val) =>
            (val as StringValue).value
        );

    test("SetEntryDescription can change an entry's description", async () => {
        const graph = await getGraph();
        assertEquals(await getFriendlyId(), ponderosaPine.description);
        const result = await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                { code: "SetEntryDescription", data: { entryId: ponderosaPine.id, description: "new description" } },
            ],
        }));
        assertEquals(await getFriendlyId(), "new description");
        assertEquals(
            result.actionDescription,
            `Edited description of \`Entry ${ponderosaPine.id}\``,
        );
    });

    test("SetEntryDescription will not change the graph if the description is the same.", async () => {
        const graph = await getGraph();
        assertEquals(await getFriendlyId(), ponderosaPine.description);
        const result = await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                {
                    code: "SetEntryDescription",
                    data: { entryId: ponderosaPine.id, description: ponderosaPine.description },
                },
            ],
        }));
        assertEquals(await getFriendlyId(), ponderosaPine.description);
        // We confirm now that no changes were actually made:
        assertEquals(result.actionDescription, "(no changes)");
    });

    test("SetEntryDescription cannot change change the description of an entry that doesn't exist", async () => {
        const graph = await getGraph();
        const invalidEntryId = VNID("_foobar843758943");
        const err = await assertRejects(
            () =>
                graph.runAsSystem(ApplyEdits({
                    siteId,
                    edits: [
                        {
                            code: "SetEntryDescription",
                            data: { entryId: invalidEntryId, description: "new description" },
                        },
                    ],
                })),
            "ApplyEdits action failed during apply() method",
        );
        assertInstanceOf(err, Error);
        assertInstanceOf(err.cause, InvalidEdit);
        assertEquals(err.cause.context.entryId, invalidEntryId);
        assertEquals(err.cause.message, "Cannot set change the entry's description - entry does not exist.");
    });

    test("SetEntryDescription cannot change change the name of an entry from another site", async () => {
        const graph = await getGraph();
        const err = await assertRejects(
            () =>
                graph.runAsSystem(ApplyEdits({
                    siteId: defaultData.otherSite.id,
                    edits: [
                        {
                            code: "SetEntryDescription",
                            data: { entryId: ponderosaPine.id, description: "new description" },
                        },
                    ],
                })),
            "ApplyEdits action failed during apply() method",
        );
        assertInstanceOf(err, Error);
        assertInstanceOf(err.cause, InvalidEdit);
        assertEquals(err.cause.context.entryId, ponderosaPine.id);
        assertEquals(err.cause.message, "Cannot set change the entry's description - entry does not exist.");
    });
});
