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
import { InvalidEdit, VNID } from "neolace/deps/neolace-api.ts";
import { AppliedEdit } from "../AppliedEdit.ts";

group("SetEntryKey edit implementation", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);
    const siteId = defaultData.site.id;
    const ponderosaPine = defaultData.entries.ponderosaPine;
    const context = new TestLookupContext({ siteId });
    const getKey = () =>
        context.evaluateExprConcrete(`entry("${ponderosaPine.id}").key`).then((val) => (val as StringValue).value);

    test("SetEntryKey can change an entry's key", async () => {
        const graph = await getGraph();
        assertEquals(await getKey(), "s-pinus-ponderosa");
        const result = await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                { code: "SetEntryKey", data: { entryId: ponderosaPine.id, key: "s-new-key" } },
            ],
            editSource: UseSystemSource,
        }));
        assertEquals(await getKey(), "s-new-key");
        assertEquals(
            result.actionDescription,
            `Changed key of \`Entry ${ponderosaPine.id}\` to "s-new-key"`,
        );
        assertEquals(result.appliedEditIds.length, 1);
    });

    test("SetEntryKey records the previous entry key.", async () => {
        const graph = await getGraph();
        const original = ponderosaPine.key;
        assertEquals(await getKey(), original);
        const result = await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                { code: "SetEntryKey", data: { entryId: ponderosaPine.id, key: "s-new-key" } },
            ],
            editSource: UseSystemSource,
        }));
        assertEquals(await getKey(), "s-new-key");
        assertEquals(result.appliedEditIds.length, 1);
        const appliedEdit = await graph.pullOne(AppliedEdit, (a) => a.oldData, { key: result.appliedEditIds[0] });
        assertEquals(appliedEdit.oldData, { key: original });
    });

    test("SetEntryKey will not change the graph if the key is the same.", async () => {
        const graph = await getGraph();
        assertEquals(await getKey(), ponderosaPine.key);
        const result = await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                {
                    code: "SetEntryKey",
                    data: { entryId: ponderosaPine.id, key: ponderosaPine.key },
                },
            ],
            editSource: UseSystemSource,
        }));
        assertEquals(await getKey(), ponderosaPine.key);
        // We confirm now that no changes were actually made:
        assertEquals(result.actionDescription, "(no changes)");
        assertEquals(result.appliedEditIds, []);
    });

    test("SetEntryKey cannot change the key of an entry that doesn't exist", async () => {
        const graph = await getGraph();
        const invalidEntryId = VNID("_foobar843758943");
        const err = await assertRejects(
            () =>
                graph.runAsSystem(ApplyEdits({
                    siteId,
                    edits: [
                        {
                            code: "SetEntryKey",
                            data: { entryId: invalidEntryId, key: "s-new-key" },
                        },
                    ],
                    editSource: UseSystemSource,
                })),
            "ApplyEdits action failed during apply() method",
        );
        assertInstanceOf(err, Error);
        assertInstanceOf(err.cause, InvalidEdit);
        assertEquals(err.cause.context.entryId, invalidEntryId);
        assertEquals(err.cause.message, "Cannot change the entry's key - entry does not exist.");
    });

    test("SetEntryKey cannot change the name of an entry from another site", async () => {
        const graph = await getGraph();
        const err = await assertRejects(
            () =>
                graph.runAsSystem(ApplyEdits({
                    siteId: defaultData.otherSite.id,
                    edits: [
                        {
                            code: "SetEntryKey",
                            data: { entryId: ponderosaPine.id, key: "s-new-key" },
                        },
                    ],
                    editSource: UseSystemSource,
                })),
            "ApplyEdits action failed during apply() method",
        );
        assertInstanceOf(err, Error);
        assertInstanceOf(err.cause, InvalidEdit);
        assertEquals(err.cause.context.entryId, ponderosaPine.id);
        assertEquals(err.cause.message, "Cannot change the entry's key - entry does not exist.");
    });
});
