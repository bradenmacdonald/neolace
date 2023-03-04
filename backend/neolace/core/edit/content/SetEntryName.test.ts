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
import { ApplyEdits, UseSystemSource } from "neolace/core/edit/ApplyEdits.ts";
import { StringValue } from "neolace/core/lookup/values.ts";
import { InvalidEdit, VNID } from "neolace/deps/neolace-sdk.ts";
import { AppliedEdit } from "../AppliedEdit.ts";

group("SetEntryName edit implementation", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);
    const siteId = defaultData.site.id;
    const ponderosaPine = defaultData.entries.ponderosaPine;
    const context = new TestLookupContext({ siteId });
    const getName = () =>
        context.evaluateExprConcrete(`entry("${ponderosaPine.id}").name`).then((val) => (val as StringValue).value);

    test("SetEntryName can change an entry's name", async () => {
        const graph = await getGraph();
        assertEquals(await getName(), "Ponderosa Pine");
        const result = await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                { code: "SetEntryName", data: { entryId: ponderosaPine.id, name: "New Name Woo" } },
            ],
            editSource: UseSystemSource,
        }));
        assertEquals(await getName(), "New Name Woo");
        assertEquals(result.actionDescription, `Renamed \`Entry ${ponderosaPine.id}\` to "New Name Woo"`);
        assertEquals(result.appliedEditIds.length, 1);
    });

    test("SetEntryName records the previous name.", async () => {
        const graph = await getGraph();
        const originalName = ponderosaPine.name;
        assertEquals(await getName(), originalName);
        const result = await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                { code: "SetEntryName", data: { entryId: ponderosaPine.id, name: "New Name Woo" } },
            ],
            editSource: UseSystemSource,
        }));
        assertEquals(await getName(), "New Name Woo");
        assertEquals(result.appliedEditIds.length, 1);
        const appliedEdit = await graph.pullOne(AppliedEdit, (a) => a.oldData, { key: result.appliedEditIds[0] });
        assertEquals(appliedEdit.oldData, { name: originalName });
    });

    test("SetEntryName will not change the graph if the name is the same.", async () => {
        const graph = await getGraph();
        assertEquals(await getName(), ponderosaPine.name);
        const result = await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                { code: "SetEntryName", data: { entryId: ponderosaPine.id, name: ponderosaPine.name } },
            ],
            editSource: UseSystemSource,
        }));
        assertEquals(await getName(), ponderosaPine.name);
        // We confirm now that no changes were actually made:
        assertEquals(result.actionDescription, "(no changes)");
        assertEquals(result.appliedEditIds, []);
    });

    test("SetEntryName cannot change the name of an entry that doesn't exist", async () => {
        const graph = await getGraph();
        const invalidEntryId = VNID("_foobar843758943");
        const err = await assertRejects(
            () =>
                graph.runAsSystem(ApplyEdits({
                    siteId,
                    edits: [
                        { code: "SetEntryName", data: { entryId: invalidEntryId, name: "New Name Woo" } },
                    ],
                    editSource: UseSystemSource,
                })),
            "ApplyEdits action failed during apply() method",
        );
        assertInstanceOf(err, Error);
        assertInstanceOf(err.cause, InvalidEdit);
        assertEquals(err.cause.context.entryId, invalidEntryId);
        assertEquals(err.cause.message, "Cannot set change the entry's name - entry does not exist.");
    });

    test("SetEntryName cannot change the name of an entry from another site", async () => {
        const graph = await getGraph();
        const err = await assertRejects(
            () =>
                graph.runAsSystem(ApplyEdits({
                    siteId: defaultData.otherSite.id,
                    edits: [
                        { code: "SetEntryName", data: { entryId: ponderosaPine.id, name: "New Name Woo" } },
                    ],
                    editSource: UseSystemSource,
                })),
            "ApplyEdits action failed during apply() method",
        );
        assertInstanceOf(err, Error);
        assertInstanceOf(err.cause, InvalidEdit);
        assertEquals(err.cause.context.entryId, ponderosaPine.id);
        assertEquals(err.cause.message, "Cannot set change the entry's name - entry does not exist.");
    });
});
