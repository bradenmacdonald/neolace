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
import { InvalidEdit, VNID } from "neolace/deps/neolace-api.ts";
import { AppliedEdit } from "../AppliedEdit.ts";

group("UpdatePropertyFact edit implementation", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);
    const siteId = defaultData.site.id;
    const ponderosaPine = defaultData.entries.ponderosaPine;
    const scientificNameProp = defaultData.schema.properties._propScientificName;
    const getScientificName = (graph: Vertex) =>
        graph.read((tx) =>
            getRawProperties({ tx, entryId: ponderosaPine.id }).then(
                (props) => props.find((p) => p.propertyId === scientificNameProp.id),
            )
        );

    test("UpdatePropertyFact can update a property fact", async () => {
        const graph = await getGraph();
        const originalValue = await getScientificName(graph);
        assert(originalValue !== undefined);
        assertEquals(originalValue.facts.length, 1);
        assertEquals(originalValue.facts[0].valueExpression, `"Pinus ponderosa"`);
        const propertyFactId = originalValue.facts[0].id;
        const result = await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                {
                    code: "UpdatePropertyFact",
                    data: {
                        entryId: ponderosaPine.id,
                        propertyFactId,
                        valueExpression: `"new value"`,
                        note: "new note",
                    },
                },
            ],
            editSource: UseSystemSource,
        }));
        const newValue = await getScientificName(graph);
        assert(newValue !== undefined);
        assertEquals(newValue.facts.length, 1);
        assertEquals(newValue.facts[0].valueExpression, `"new value"`);
        assertEquals(newValue.facts[0].note, "new note");
        assertEquals(
            result.actionDescription,
            `Updated \`PropertyFact ${propertyFactId}\` property value from \`Entry ${ponderosaPine.id}\``,
        );
        assertEquals(result.appliedEditIds.length, 1);
    });

    test("UpdatePropertyFact records the previous property fact values.", async () => {
        const graph = await getGraph();
        const originalValue = await getScientificName(graph);
        assert(originalValue !== undefined);
        const originalFact = originalValue.facts[0];
        const propertyFactId = originalFact.id;
        const result = await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                {
                    code: "UpdatePropertyFact",
                    data: {
                        entryId: ponderosaPine.id,
                        propertyFactId,
                        valueExpression: `"new value"`,
                        note: "new note",
                    },
                },
            ],
            editSource: UseSystemSource,
        }));
        assertEquals((await getScientificName(graph))?.facts[0].valueExpression, `"new value"`);
        assertEquals(result.appliedEditIds.length, 1);
        const appliedEdit = await graph.pullOne(AppliedEdit, (a) => a.oldData, { key: result.appliedEditIds[0] });
        assertEquals(appliedEdit.oldData, {
            valueExpression: originalFact.valueExpression,
            note: "",
        });
    });

    test("UpdatePropertyFact will not change the graph if the fact isn't changed.", async () => {
        const graph = await getGraph();
        const originalValue = await getScientificName(graph);
        assert(originalValue !== undefined);
        const originalFact = originalValue.facts[0];
        const propertyFactId = originalFact.id;
        const result = await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                {
                    code: "UpdatePropertyFact",
                    data: {
                        entryId: ponderosaPine.id,
                        propertyFactId,
                        valueExpression: originalFact.valueExpression,
                        rank: originalFact.rank,
                    },
                },
            ],
            editSource: UseSystemSource,
        }));
        // We confirm now that no changes were actually made:
        assertEquals(result.actionDescription, "(no changes)");
        assertEquals(result.appliedEditIds, []);
    });

    test("UpdatePropertyFact cannot delete a fact from an entry that doesn't exist", async () => {
        const graph = await getGraph();
        const invalidEntryId = VNID("_foobar843758943");
        const err = await assertRejects(
            () =>
                graph.runAsSystem(ApplyEdits({
                    siteId,
                    edits: [
                        {
                            code: "UpdatePropertyFact",
                            data: { entryId: invalidEntryId, propertyFactId: VNID(), valueExpression: "foobar" },
                        },
                    ],
                    editSource: UseSystemSource,
                })),
            "ApplyEdits action failed during apply() method",
        );
        assertInstanceOf(err, Error);
        assertInstanceOf(err.cause, InvalidEdit);
        assertEquals(err.cause.context.entryId, invalidEntryId);
        assertEquals(err.cause.message, "That property fact does not exist on that entry.");
    });

    test("UpdatePropertyFact cannot delete a PropertyFact of an entry from another site", async () => {
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
                            code: "UpdatePropertyFact",
                            data: {
                                entryId: ponderosaPine.id,
                                propertyFactId,
                                valueExpression: `"new value"`,
                                note: "new note",
                            },
                        },
                    ],
                    editSource: UseSystemSource,
                })),
            "ApplyEdits action failed during apply() method",
        );
        assertInstanceOf(err, Error);
        assertInstanceOf(err.cause, InvalidEdit);
        assertEquals(err.cause.context.entryId, ponderosaPine.id);
        assertEquals(err.cause.message, "That property fact does not exist on that entry.");
    });
});
