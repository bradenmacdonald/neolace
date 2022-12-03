import { VNID } from "neolace/deps/vertex-framework.ts";
import { PropertyType } from "neolace/deps/neolace-api.ts";
import {
    assertArrayIncludes,
    assertEquals,
    assertInstanceOf,
    createManyEntries,
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
import { AllEntries } from "../../expressions.ts";

group("graph()", () => {
    // These tests are read-only so don't need isolation, but do use the default plantDB example data:
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const siteId = defaultData.site.id;
    const ponderosaPine = defaultData.entries.ponderosaPine;
    const context = new TestLookupContext({ siteId, entryId: ponderosaPine.id });

    const entryTypeKey = "test-entry-type", entryIsA = "prop-is-a";
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
                entryTypeKey: defaultData.schema.entryTypes.ETSPECIES.key,
                name: "Ponderosa Pine",
                isFocusEntry: true,
            },
            {
                entryId: defaultData.entries.genusPinus.id,
                entryTypeKey: defaultData.schema.entryTypes.ETGENUS.key,
                name: "Pinus",
            },
            {
                entryId: defaultData.entries.familyPinaceae.id,
                entryTypeKey: defaultData.schema.entryTypes.ETFAMILY.key,
                name: "Pinaceae",
            },
            {
                entryId: defaultData.entries.orderPinales.id,
                entryTypeKey: defaultData.schema.entryTypes.ETORDER.key,
                name: "Pinales",
            },
            {
                entryId: defaultData.entries.classPinopsida.id,
                entryTypeKey: defaultData.schema.entryTypes.ETCLASS.key,
                name: "Pinopsida",
            },
            {
                entryId: defaultData.entries.divisionTracheophyta.id,
                entryTypeKey: defaultData.schema.entryTypes.ETDIVISION.key,
                name: "Tracheophyta",
            },
        ]);
        const expectedRels = [
            {
                fromEntryId: defaultData.entries.classPinopsida.id,
                relTypeKey: defaultData.schema.properties.parentDivision.key,
                toEntryId: defaultData.entries.divisionTracheophyta.id,
            },
            {
                fromEntryId: defaultData.entries.orderPinales.id,
                relTypeKey: defaultData.schema.properties.parentClass.key,
                toEntryId: defaultData.entries.classPinopsida.id,
            },
            {
                fromEntryId: defaultData.entries.familyPinaceae.id,
                relTypeKey: defaultData.schema.properties.parentOrder.key,
                toEntryId: defaultData.entries.orderPinales.id,
            },
            {
                fromEntryId: defaultData.entries.genusPinus.id,
                relTypeKey: defaultData.schema.properties.parentFamily.key,
                toEntryId: defaultData.entries.familyPinaceae.id,
            },
            {
                fromEntryId: defaultData.entries.ponderosaPine.id,
                relTypeKey: defaultData.schema.properties.parentGenus.key,
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
                { code: "CreateEntryType", data: { key: entryTypeKey, name: "EntryType" } },
                {
                    code: "CreateProperty",
                    data: { key: entryIsA, type: PropertyType.RelIsA, name: "is a", appliesTo: [{ entryTypeKey }] },
                },
                {
                    code: "CreateEntry",
                    data: { entryId: A, name: "Entry A", entryTypeKey, key: "a", description: "" },
                },
                {
                    code: "CreateEntry",
                    data: { entryId: B, name: "Entry B", entryTypeKey, key: "b", description: "" },
                },
                {
                    code: "CreateEntry",
                    data: { entryId: C, name: "Entry C", entryTypeKey, key: "c", description: "" },
                },
                {
                    code: "CreateEntry",
                    data: { entryId: D, name: "Entry D", entryTypeKey, key: "d", description: "" },
                },
                // B is a A
                {
                    code: "AddPropertyFact",
                    data: {
                        entryId: B,
                        valueExpression: `entry("${A}")`,
                        propertyKey: entryIsA,
                        propertyFactId: VNID(),
                    },
                },
                // C is a A
                {
                    code: "AddPropertyFact",
                    data: {
                        entryId: C,
                        valueExpression: `entry("${A}")`,
                        propertyKey: entryIsA,
                        propertyFactId: VNID(),
                    },
                },
                // D is a B
                {
                    code: "AddPropertyFact",
                    data: {
                        entryId: D,
                        valueExpression: `entry("${B}")`,
                        propertyKey: entryIsA,
                        propertyFactId: VNID(),
                    },
                },
                // D is a C
                {
                    code: "AddPropertyFact",
                    data: {
                        entryId: D,
                        valueExpression: `entry("${C}")`,
                        propertyKey: entryIsA,
                        propertyFactId: VNID(),
                    },
                },
                // A is a D
                {
                    code: "AddPropertyFact",
                    data: {
                        entryId: A,
                        valueExpression: `entry("${D}")`,
                        propertyKey: entryIsA,
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
                entryTypeKey,
                name: "Entry A",
                isFocusEntry: true,
            },
            {
                entryId: D,
                entryTypeKey,
                name: "Entry D",
            },
            {
                entryId: B,
                entryTypeKey,
                name: "Entry B",
            },
            {
                entryId: C,
                entryTypeKey,
                name: "Entry C",
            },
        ]);

        // These are the expected relationships, without 'relId' since that will be different each time.
        const expectedRels = [
            {
                fromEntryId: A,
                relTypeKey: entryIsA,
                toEntryId: D,
            },
            {
                fromEntryId: B,
                relTypeKey: entryIsA,
                toEntryId: A,
            },
            {
                fromEntryId: C,
                relTypeKey: entryIsA,
                toEntryId: A,
            },
            {
                fromEntryId: D,
                relTypeKey: entryIsA,
                toEntryId: C,
            },
            {
                fromEntryId: D,
                relTypeKey: entryIsA,
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

group("graph() limit tests", () => {
    // These tests need isolation:
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);
    const context = new TestLookupContext({ siteId: defaultData.site.id });

    test("Limits the total number of nodes that can be returned.", async () => {
        // Create 6,000 entries:
        const numEntries = 6_000;
        const entryTypeKey = defaultData.schema.entryTypes.ETSPECIES.key;
        await createManyEntries(defaultData.site.id, entryTypeKey, numEntries);

        const expression = new Graph(new AllEntries());
        const value = await context.evaluateExprConcrete(expression);

        assertInstanceOf(value, GraphValue);
        assertEquals(value.entries.length, 5_000);
    });
});
