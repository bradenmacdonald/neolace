import { VNID } from "neolace/deps/vertex-framework.ts";
import { PropertyType } from "neolace/deps/neolace-api.ts";
import {
    assertArrayIncludes,
    assertEquals,
    assertInstanceOf,
    group,
    setTestIsolation,
    test,
} from "neolace/lib/tests.ts";
import { getGraph } from "neolace/core/graph.ts";
import { AndAncestors } from "./ancestors.ts";
import { GraphValue } from "../values.ts";
import { This } from "./this.ts";
import { Graph } from "./graph.ts";
import { ApplyEdits } from "neolace/core/edit/ApplyEdits.ts";
import { Descendants } from "./descendants.ts";

group("graph()", () => {
    // These tests are read-only so don't need isolation, but do use the default plantDB example data:
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const siteId = defaultData.site.id;
    const ponderosaPine = defaultData.entries.ponderosaPine;

    const entryType = VNID(), entryIsA = VNID();
    const A = VNID(),
        B = VNID(),
        C = VNID(),
        D = VNID();

    test("It can graph all the ancestors of the ponderosa pine", async () => {
        // this is the same as this.ancestors().graph()
        const expression = new Graph(new AndAncestors(new This()));

        const graph = await getGraph();
        const value = await graph.read((tx) =>
            expression.getValue({ tx, siteId, entryId: ponderosaPine.id, defaultPageSize: 10n }).then((v) =>
                v.makeConcrete()
            )
        );

        assertEquals(
            value,
            new GraphValue(
                [
                    {
                        data: {},
                        entryId: defaultData.entries.ponderosaPine.id,
                        entryType: defaultData.schema.entryTypes._ETSPECIES.id,
                        name: "Ponderosa Pine",
                    },
                    {
                        data: {},
                        entryId: defaultData.entries.genusPinus.id,
                        entryType: defaultData.schema.entryTypes._ETGENUS.id,
                        name: "Pinus",
                    },
                    {
                        data: {},
                        entryId: defaultData.entries.familyPinaceae.id,
                        entryType: defaultData.schema.entryTypes._ETFAMILY.id,
                        name: "Pinaceae",
                    },
                    {
                        data: {},
                        entryId: defaultData.entries.orderPinales.id,
                        entryType: defaultData.schema.entryTypes._ETORDER.id,
                        name: "Pinales",
                    },
                    {
                        data: {},
                        entryId: defaultData.entries.classPinopsida.id,
                        entryType: defaultData.schema.entryTypes._ETCLASS.id,
                        name: "Pinopsida",
                    },
                    {
                        data: {},
                        entryId: defaultData.entries.divisionTracheophyta.id,
                        entryType: defaultData.schema.entryTypes._ETDIVISION.id,
                        name: "Tracheophyta",
                    },
                ],
                [
                    {
                        data: {},
                        fromEntryId: defaultData.entries.classPinopsida.id,
                        relId: (value as GraphValue).rels[0]?.relId,
                        relType: defaultData.schema.properties._parentDivision.id,
                        toEntryId: defaultData.entries.divisionTracheophyta.id,
                    },
                    {
                        data: {},
                        fromEntryId: defaultData.entries.orderPinales.id,
                        relId: (value as GraphValue).rels[1]?.relId,
                        relType: defaultData.schema.properties._parentClass.id,
                        toEntryId: defaultData.entries.classPinopsida.id,
                    },
                    {
                        data: {},
                        fromEntryId: defaultData.entries.familyPinaceae.id,
                        relId: (value as GraphValue).rels[2]?.relId,
                        relType: defaultData.schema.properties._parentOrder.id,
                        toEntryId: defaultData.entries.orderPinales.id,
                    },
                    {
                        data: {},
                        fromEntryId: defaultData.entries.genusPinus.id,
                        relId: (value as GraphValue).rels[3]?.relId,
                        relType: defaultData.schema.properties._parentFamily.id,
                        toEntryId: defaultData.entries.familyPinaceae.id,
                    },
                    {
                        data: {},
                        fromEntryId: defaultData.entries.ponderosaPine.id,
                        relId: (value as GraphValue).rels[4]?.relId,
                        relType: defaultData.schema.properties._parentGenus.id,
                        toEntryId: defaultData.entries.genusPinus.id,
                    },
                ],
            ),
        );
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
                    data: { id: A, name: "Entry A", type: entryType, friendlyId: "a", description: "" },
                },
                {
                    code: "CreateEntry",
                    data: { id: B, name: "Entry B", type: entryType, friendlyId: "b", description: "" },
                },
                {
                    code: "CreateEntry",
                    data: { id: C, name: "Entry C", type: entryType, friendlyId: "c", description: "" },
                },
                {
                    code: "CreateEntry",
                    data: { id: D, name: "Entry D", type: entryType, friendlyId: "d", description: "" },
                },
                // B is a A
                {
                    code: "AddPropertyValue",
                    data: {
                        entry: B,
                        valueExpression: `[[/entry/${A}]]`,
                        property: entryIsA,
                        propertyFactId: VNID(),
                        note: "",
                    },
                },
                // C is a A
                {
                    code: "AddPropertyValue",
                    data: {
                        entry: C,
                        valueExpression: `[[/entry/${A}]]`,
                        property: entryIsA,
                        propertyFactId: VNID(),
                        note: "",
                    },
                },
                // D is a B
                {
                    code: "AddPropertyValue",
                    data: {
                        entry: D,
                        valueExpression: `[[/entry/${B}]]`,
                        property: entryIsA,
                        propertyFactId: VNID(),
                        note: "",
                    },
                },
                // D is a C
                {
                    code: "AddPropertyValue",
                    data: {
                        entry: D,
                        valueExpression: `[[/entry/${C}]]`,
                        property: entryIsA,
                        propertyFactId: VNID(),
                        note: "",
                    },
                },
                // A is a D
                {
                    code: "AddPropertyValue",
                    data: {
                        entry: A,
                        valueExpression: `[[/entry/${D}]]`,
                        property: entryIsA,
                        propertyFactId: VNID(),
                        note: "",
                    },
                },
            ],
        }));

        const expression = new Graph(new AndAncestors(new This()));
        const value = await graph.read((tx) =>
            expression.getValue({ tx, siteId, entryId: A, defaultPageSize: 10n }).then((v) => v.makeConcrete())
        );

        assertInstanceOf(value, GraphValue);
        assertEquals<typeof value.entries>(value.entries, [
            {
                data: {},
                entryId: A,
                entryType: entryType,
                name: "Entry A",
            },
            {
                data: {},
                entryId: D,
                entryType: entryType,
                name: "Entry D",
            },
            {
                data: {},
                entryId: B,
                entryType: entryType,
                name: "Entry B",
            },
            {
                data: {},
                entryId: C,
                entryType: entryType,
                name: "Entry C",
            },
        ]);

        // These are the expected relationships, without 'relId' since that will be different each time.
        const expectedRels = [
            {
                data: {},
                fromEntryId: A,
                relType: entryIsA,
                toEntryId: D,
            },
            {
                data: {},
                fromEntryId: B,
                relType: entryIsA,
                toEntryId: A,
            },
            {
                data: {},
                fromEntryId: C,
                relType: entryIsA,
                toEntryId: A,
            },
            {
                data: {},
                fromEntryId: D,
                relType: entryIsA,
                toEntryId: C,
            },
            {
                data: {},
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
        const graph = await getGraph();

        // Ponderosa pine has no descendants so this will be an empty set of entries to graph:
        const expression = new Graph(new Descendants(new This()));
        const value = await graph.read((tx) =>
            expression.getValue({ tx, siteId, entryId: ponderosaPine.id, defaultPageSize: 10n }).then((v) =>
                v.makeConcrete()
            )
        );

        assertEquals(value, new GraphValue([], []));
    });
});
