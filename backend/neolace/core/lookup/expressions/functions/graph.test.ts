import { VNID } from "neolace/deps/vertex-framework.ts";
import { PropertyType } from "neolace/deps/neolace-api.ts";
import {
    assertArrayIncludes,
    assertEquals,
    assertInstanceOf,
    group,
    setTestIsolation,
    test,
    TestLookupContext,
} from "neolace/lib/tests.ts";
import { getGraph } from "neolace/core/graph.ts";
import { AndAncestors } from "./ancestors.ts";
import { GraphValue } from "../../values.ts";
import { This } from "../this.ts";
import { Graph } from "./graph.ts";
import { ApplyEdits, UseSystemSource } from "neolace/core/edit/ApplyEdits.ts";
import { Descendants } from "./descendants.ts";

group("graph()", () => {
    // These tests are read-only so don't need isolation, but do use the default plantDB example data:
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const siteId = defaultData.site.id;
    const ponderosaPine = defaultData.entries.ponderosaPine;
    const context = new TestLookupContext({ siteId, entryId: ponderosaPine.id });

    const entryType = VNID(), entryIsA = VNID();
    const A = VNID(),
        B = VNID(),
        C = VNID(),
        D = VNID();

    test("It can graph all the ancestors of the ponderosa pine", async () => {
        const value = await context.evaluateExprConcrete("this.andAncestors().graph()");

        assertInstanceOf(value, GraphValue);
        assertEquals(value.entries, [
            {
                entryId: defaultData.entries.ponderosaPine.id,
                entryType: defaultData.schema.entryTypes._ETSPECIES.id,
                name: "Ponderosa Pine",
                isFocusEntry: true,
            },
            {
                entryId: defaultData.entries.genusPinus.id,
                entryType: defaultData.schema.entryTypes._ETGENUS.id,
                name: "Pinus",
            },
            {
                entryId: defaultData.entries.familyPinaceae.id,
                entryType: defaultData.schema.entryTypes._ETFAMILY.id,
                name: "Pinaceae",
            },
            {
                entryId: defaultData.entries.orderPinales.id,
                entryType: defaultData.schema.entryTypes._ETORDER.id,
                name: "Pinales",
            },
            {
                entryId: defaultData.entries.classPinopsida.id,
                entryType: defaultData.schema.entryTypes._ETCLASS.id,
                name: "Pinopsida",
            },
            {
                entryId: defaultData.entries.divisionTracheophyta.id,
                entryType: defaultData.schema.entryTypes._ETDIVISION.id,
                name: "Tracheophyta",
            },
        ]);
        const expectedRels = [
            {
                fromEntryId: defaultData.entries.classPinopsida.id,
                relType: defaultData.schema.properties._parentDivision.id,
                toEntryId: defaultData.entries.divisionTracheophyta.id,
            },
            {
                fromEntryId: defaultData.entries.orderPinales.id,
                relType: defaultData.schema.properties._parentClass.id,
                toEntryId: defaultData.entries.classPinopsida.id,
            },
            {
                fromEntryId: defaultData.entries.familyPinaceae.id,
                relType: defaultData.schema.properties._parentOrder.id,
                toEntryId: defaultData.entries.orderPinales.id,
            },
            {
                fromEntryId: defaultData.entries.genusPinus.id,
                relType: defaultData.schema.properties._parentFamily.id,
                toEntryId: defaultData.entries.familyPinaceae.id,
            },
            {
                fromEntryId: defaultData.entries.ponderosaPine.id,
                relType: defaultData.schema.properties._parentGenus.id,
                toEntryId: defaultData.entries.genusPinus.id,
            },
        ];
        assertEquals(value.rels.length, expectedRels.length);
        // Because the order of the relationships changes over time, we have to test this way:
        const actualRelsWithoutRelId = value.rels.map((r) => {
            const { relId: _unused, ...rest } = r;
            return rest;
        });
        assertArrayIncludes(actualRelsWithoutRelId, expectedRels);
    });

    test("Works despite cyclic relationships", async () => {
        // Create this entry tree:
        //     A
        //    / \
        //   B   C
        //    \ /
        //     D
        //      \
        //       A (same A as above)
        const graph = await getGraph();

        await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                { code: "CreateEntryType", data: { id: entryType, name: "EntryType" } },
                {
                    code: "CreateProperty",
                    data: { id: entryIsA, type: PropertyType.RelIsA, name: "is a", appliesTo: [{ entryType }] },
                },
                {
                    code: "CreateEntry",
                    data: { entryId: A, name: "Entry A", type: entryType, friendlyId: "a", description: "" },
                },
                {
                    code: "CreateEntry",
                    data: { entryId: B, name: "Entry B", type: entryType, friendlyId: "b", description: "" },
                },
                {
                    code: "CreateEntry",
                    data: { entryId: C, name: "Entry C", type: entryType, friendlyId: "c", description: "" },
                },
                {
                    code: "CreateEntry",
                    data: { entryId: D, name: "Entry D", type: entryType, friendlyId: "d", description: "" },
                },
                // B is a A
                {
                    code: "AddPropertyFact",
                    data: {
                        entryId: B,
                        valueExpression: `entry("${A}")`,
                        propertyId: entryIsA,
                        propertyFactId: VNID(),
                    },
                },
                // C is a A
                {
                    code: "AddPropertyFact",
                    data: {
                        entryId: C,
                        valueExpression: `entry("${A}")`,
                        propertyId: entryIsA,
                        propertyFactId: VNID(),
                    },
                },
                // D is a B
                {
                    code: "AddPropertyFact",
                    data: {
                        entryId: D,
                        valueExpression: `entry("${B}")`,
                        propertyId: entryIsA,
                        propertyFactId: VNID(),
                    },
                },
                // D is a C
                {
                    code: "AddPropertyFact",
                    data: {
                        entryId: D,
                        valueExpression: `entry("${C}")`,
                        propertyId: entryIsA,
                        propertyFactId: VNID(),
                    },
                },
                // A is a D
                {
                    code: "AddPropertyFact",
                    data: {
                        entryId: A,
                        valueExpression: `entry("${D}")`,
                        propertyId: entryIsA,
                        propertyFactId: VNID(),
                    },
                },
            ],
            editSource: UseSystemSource,
        }));

        const expression = new Graph(new AndAncestors(new This()));
        // Get A and its ancestors:
        const value = await context.evaluateExprConcrete(expression, A);

        assertInstanceOf(value, GraphValue);
        assertEquals<typeof value.entries>(value.entries, [
            {
                entryId: A,
                entryType: entryType,
                name: "Entry A",
                isFocusEntry: true,
            },
            {
                entryId: D,
                entryType: entryType,
                name: "Entry D",
            },
            {
                entryId: B,
                entryType: entryType,
                name: "Entry B",
            },
            {
                entryId: C,
                entryType: entryType,
                name: "Entry C",
            },
        ]);

        // These are the expected relationships, without 'relId' since that will be different each time.
        const expectedRels = [
            {
                fromEntryId: A,
                relType: entryIsA,
                toEntryId: D,
            },
            {
                fromEntryId: B,
                relType: entryIsA,
                toEntryId: A,
            },
            {
                fromEntryId: C,
                relType: entryIsA,
                toEntryId: A,
            },
            {
                fromEntryId: D,
                relType: entryIsA,
                toEntryId: C,
            },
            {
                fromEntryId: D,
                relType: entryIsA,
                toEntryId: B,
            },
        ];
        assertEquals(value.rels.length, expectedRels.length);
        // Because the order of the relationships changes over time, we have to test this way:
        const actualRelsWithoutRelId = value.rels.map((r) => {
            const { relId: _unused, ...rest } = r;
            return rest;
        });
        assertArrayIncludes(actualRelsWithoutRelId, expectedRels);
    });

    test("Works on empty values", async () => {
        // Ponderosa pine has no descendants so this will be an empty set of entries to graph:
        const expression = new Graph(new Descendants(new This()));
        const value = await context.evaluateExprConcrete(expression);

        assertEquals(value, new GraphValue([], []));
    });

    test("toString()", () => {
        assertEquals(new Graph(new This()).toString(), "this.graph()");
    });
});
