import { Vertex } from "neolace/deps/vertex-framework.ts";
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
import { ApplyEdits, UseSystemSource } from "neolace/core/edit/ApplyEdits.ts";
import { getRawProperties } from "neolace/core/entry/properties.ts";
import { InvalidEdit, VNID } from "neolace/deps/neolace-sdk.ts";
import { AppliedEdit } from "../AppliedEdit.ts";

group("DeletePropertyFact edit implementation", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);
    const siteId = defaultData.site.id;
    const ponderosaPine = defaultData.entries.ponderosaPine;
    const scientificNameProp = defaultData.schema.properties.propScientificName;
    const getScientificName = (graph: Vertex) =>
        graph.read((tx) =>
            getRawProperties({ tx, entryId: ponderosaPine.id }).then(
                (props) => props.find((p) => p.propertyKey === scientificNameProp.key),
            )
        );

    test("DeletePropertyFact can delete a property fact.", async () => {
        const graph = await getGraph();
        const originalValue = await getScientificName(graph);
        assert(originalValue !== undefined);
        assertEquals(originalValue.facts.length, 1);
        assertEquals(originalValue.facts[0].valueExpression, `"Pinus ponderosa"`);
        const propertyFactId = originalValue.facts[0].id;
        const result = await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                { code: "DeletePropertyFact", data: { entryId: ponderosaPine.id, propertyFactId } },
            ],
            editSource: UseSystemSource,
        }));
        assertEquals(await getScientificName(graph), undefined);
        assertEquals(
            result.actionDescription,
            `Deleted \`PropertyFact ${propertyFactId}\` from \`Entry ${ponderosaPine.id}\``,
        );
        assertEquals(result.appliedEditIds.length, 1);
    });

    test("DeletePropertyFact records the previous property fact values.", async () => {
        const graph = await getGraph();
        const originalValue = await getScientificName(graph);
        assert(originalValue !== undefined);
        const propertyFactId = originalValue.facts[0].id;
        const result = await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                { code: "DeletePropertyFact", data: { entryId: ponderosaPine.id, propertyFactId } },
            ],
            editSource: UseSystemSource,
        }));
        assertEquals(await getScientificName(graph), undefined);
        assertEquals(result.appliedEditIds.length, 1);
        const appliedEdit = await graph.pullOne(AppliedEdit, (a) => a.oldData, { key: result.appliedEditIds[0] });
        const { id: _, ...oldFactDetails } = originalValue.facts[0];
        assertEquals(appliedEdit.oldData, {
            fact: oldFactDetails,
        });
    });

    test("DeletePropertyFact will not change the graph if the fact is already deleted.", async () => {
        const graph = await getGraph();
        const originalValue = await getScientificName(graph);
        assert(originalValue !== undefined);
        const propertyFactId = originalValue.facts[0].id;
        // First delete the fact:
        await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                { code: "DeletePropertyFact", data: { entryId: ponderosaPine.id, propertyFactId } },
            ],
            editSource: UseSystemSource,
        }));
        assertEquals(await getScientificName(graph), undefined);
        // Now delete it a second time:
        const result = await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                {
                    code: "DeletePropertyFact",
                    data: { entryId: ponderosaPine.id, propertyFactId: VNID() },
                },
            ],
            editSource: UseSystemSource,
        }));
        // We confirm now that no changes were actually made:
        assertEquals(result.actionDescription, "(no changes)");
        assertEquals(result.appliedEditIds, []);
    });

    test("DeletePropertyFact cannot delete a fact from an entry that doesn't exist", async () => {
        const graph = await getGraph();
        const invalidEntryId = VNID("_foobar843758943");
        const err = await assertRejects(
            () =>
                graph.runAsSystem(ApplyEdits({
                    siteId,
                    edits: [
                        {
                            code: "DeletePropertyFact",
                            data: { entryId: invalidEntryId, propertyFactId: VNID() },
                        },
                    ],
                    editSource: UseSystemSource,
                })),
            "ApplyEdits action failed during apply() method",
        );
        assertInstanceOf(err, Error);
        assertInstanceOf(err.cause, InvalidEdit);
        assertEquals(err.cause.context.entryId, invalidEntryId);
        assertEquals(err.cause.message, "Cannot delete property fact - entry does not exist.");
    });

    test("DeletePropertyFact cannot delete a PropertyFact of an entry from another site", async () => {
        const graph = await getGraph();
        const originalValue = await getScientificName(graph);
        assert(originalValue !== undefined);
        const propertyFactId = originalValue.facts[0].id;
        const err = await assertRejects(
            () =>
                graph.runAsSystem(ApplyEdits({
                    siteId: defaultData.otherSite.id,
                    edits: [
                        {
                            code: "DeletePropertyFact",
                            data: { entryId: ponderosaPine.id, propertyFactId },
                        },
                    ],
                    editSource: UseSystemSource,
                })),
            "ApplyEdits action failed during apply() method",
        );
        assertInstanceOf(err, Error);
        assertInstanceOf(err.cause, InvalidEdit);
        assertEquals(err.cause.context.entryId, ponderosaPine.id);
        assertEquals(err.cause.message, "Cannot delete property fact - entry does not exist.");
    });
});
