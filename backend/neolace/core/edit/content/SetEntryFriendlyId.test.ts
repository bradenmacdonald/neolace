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

group("SetEntryFriendlyId edit implementation", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);
    const siteId = defaultData.site.id;
    const ponderosaPine = defaultData.entries.ponderosaPine;
    const context = new TestLookupContext({ siteId });
    const getFriendlyId = () =>
        context.evaluateExprConcrete(`entry("${ponderosaPine.id}").friendlyId`).then((val) =>
            (val as StringValue).value
        );

    test("SetEntryFriendlyId can change an entry's friendlyId", async () => {
        const graph = await getGraph();
        assertEquals(await getFriendlyId(), "s-pinus-ponderosa");
        const result = await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                { code: "SetEntryFriendlyId", data: { entryId: ponderosaPine.id, friendlyId: "s-new-friendly-id" } },
            ],
            editSource: UseSystemSource,
        }));
        assertEquals(await getFriendlyId(), "s-new-friendly-id");
        assertEquals(
            result.actionDescription,
            `Changed friendly ID of \`Entry ${ponderosaPine.id}\` to "s-new-friendly-id"`,
        );
        assertEquals(result.appliedEditIds.length, 1);
    });

    test("SetEntryFriendlyId records the previous friendly ID.", async () => {
        const graph = await getGraph();
        const original = ponderosaPine.friendlyId;
        assertEquals(await getFriendlyId(), original);
        const result = await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                { code: "SetEntryFriendlyId", data: { entryId: ponderosaPine.id, friendlyId: "s-new-friendly-id" } },
            ],
            editSource: UseSystemSource,
        }));
        assertEquals(await getFriendlyId(), "s-new-friendly-id");
        assertEquals(result.appliedEditIds.length, 1);
        const appliedEdit = await graph.pullOne(AppliedEdit, (a) => a.oldData(), { key: result.appliedEditIds[0] });
        assertEquals(appliedEdit.oldData, { friendlyId: original });
    });

    test("SetEntryFriendlyId will not change the graph if the friendlyId is the same.", async () => {
        const graph = await getGraph();
        assertEquals(await getFriendlyId(), ponderosaPine.friendlyId);
        const result = await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                {
                    code: "SetEntryFriendlyId",
                    data: { entryId: ponderosaPine.id, friendlyId: ponderosaPine.friendlyId },
                },
            ],
            editSource: UseSystemSource,
        }));
        assertEquals(await getFriendlyId(), ponderosaPine.friendlyId);
        // We confirm now that no changes were actually made:
        assertEquals(result.actionDescription, "(no changes)");
        assertEquals(result.appliedEditIds, []);
    });

    test("SetEntryFriendlyId cannot change change the friendlyId of an entry that doesn't exist", async () => {
        const graph = await getGraph();
        const invalidEntryId = VNID("_foobar843758943");
        const err = await assertRejects(
            () =>
                graph.runAsSystem(ApplyEdits({
                    siteId,
                    edits: [
                        {
                            code: "SetEntryFriendlyId",
                            data: { entryId: invalidEntryId, friendlyId: "s-new-friendly-id" },
                        },
                    ],
                    editSource: UseSystemSource,
                })),
            "ApplyEdits action failed during apply() method",
        );
        assertInstanceOf(err, Error);
        assertInstanceOf(err.cause, InvalidEdit);
        assertEquals(err.cause.context.entryId, invalidEntryId);
        assertEquals(err.cause.message, "Cannot set change the entry's friendly ID - entry does not exist.");
    });

    test("SetEntryFriendlyId cannot change change the name of an entry from another site", async () => {
        const graph = await getGraph();
        const err = await assertRejects(
            () =>
                graph.runAsSystem(ApplyEdits({
                    siteId: defaultData.otherSite.id,
                    edits: [
                        {
                            code: "SetEntryFriendlyId",
                            data: { entryId: ponderosaPine.id, friendlyId: "s-new-friendly-id" },
                        },
                    ],
                    editSource: UseSystemSource,
                })),
            "ApplyEdits action failed during apply() method",
        );
        assertInstanceOf(err, Error);
        assertInstanceOf(err.cause, InvalidEdit);
        assertEquals(err.cause.context.entryId, ponderosaPine.id);
        assertEquals(err.cause.message, "Cannot set change the entry's friendly ID - entry does not exist.");
    });
});
