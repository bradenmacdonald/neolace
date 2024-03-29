/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { C, Field, VNID } from "neolace/deps/vertex-framework.ts";
import { EditList, PropertyMode, PropertyType } from "neolace/deps/neolace-sdk.ts";

import { assertEquals, beforeAll, group, resetDBToBlankSnapshot, setTestIsolation, test } from "neolace/lib/tests.ts";
import { getGraph } from "neolace/core/graph.ts";
import { CreateSite } from "neolace/core/Site.ts";
import { ApplyEdits, UseSystemSource } from "neolace/core/edit/ApplyEdits.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { Property } from "neolace/core/schema/Property.ts";
import { PropertyFact } from "neolace/core/entry/PropertyFact.ts";
import {
    EntryPropertyValueSet,
    getEntriesProperty,
    getEntryProperties,
    getEntryProperty,
} from "neolace/core/entry/properties.ts";

group("properties.ts", () => {
    group("set property values", () => {
        const entryTypeKey = "ET-TEST";
        const siteId = VNID();
        beforeAll(async () => {
            const graph = await getGraph();
            await resetDBToBlankSnapshot();
            // Create a site and an entry type:
            await graph.runAsSystem(CreateSite({
                id: siteId,
                name: "Test Site",
                domain: "test-site.neolace.net",
                key: "test",
            }));
            await graph.runAsSystem(ApplyEdits({
                siteId,
                edits: [
                    { code: "CreateEntryType", data: { key: entryTypeKey, name: "EntryType" } },
                ],
                editSource: UseSystemSource,
            }));
        });

        test("Define a new value property and set it on an entry", async () => {
            const graph = await getGraph();
            const entryId = VNID();
            const propertyKey = "P123";
            await graph.runAsSystem(ApplyEdits({
                siteId,
                edits: [
                    {
                        code: "CreateEntry",
                        data: {
                            entryId,
                            name: "Entry",
                            entryTypeKey,
                            description: "Testing",
                            key: "te1",
                        },
                    },
                    {
                        code: "CreateProperty",
                        data: { key: propertyKey, name: "Property", appliesTo: [{ entryTypeKey }] },
                    },
                ],
                editSource: UseSystemSource,
            }));
            await graph.runAsSystem(ApplyEdits({
                siteId,
                edits: [
                    {
                        code: "AddPropertyFact",
                        data: {
                            entryId,
                            propertyKey,
                            propertyFactId: VNID(),
                            valueExpression: `"the value"`,
                        },
                    },
                ],
                editSource: UseSystemSource,
            }));
            // Now just read the value from the graph, so we're only testing the write functions, not the read ones:
            const result = await graph.read((tx) =>
                tx.query(C`
                MATCH (entry:${Entry} {id: ${entryId}})
                MATCH (prop:${Property} {siteNamespace: ${siteId}, key: ${propertyKey}})
                MATCH (entry)-[:${Entry.rel.PROP_FACT}]->(fact:${PropertyFact})-[:${PropertyFact.rel.FOR_PROP}]->(prop)
            `.RETURN({ fact: Field.VNode(PropertyFact) }))
            );
            assertEquals(result.length, 1);
            assertEquals(result[0].fact.valueExpression, `"the value"`);
            assertEquals(result[0].fact.note, "");
            assertEquals(result[0].fact.directRelNeo4jId, null); // Only set for relationship properties
        });

        test("Define a new relationship property and set it on an entry", async () => {
            const graph = await getGraph();
            const entryA = VNID(), entryB = VNID();
            const propertyKey = "P234";
            await graph.runAsSystem(ApplyEdits({
                siteId,
                edits: [
                    {
                        code: "CreateEntry",
                        data: {
                            entryId: entryA,
                            name: "Entry A",
                            entryTypeKey,
                            description: "Testing",
                            key: "te2a",
                        },
                    },
                    {
                        code: "CreateEntry",
                        data: {
                            entryId: entryB,
                            name: "Entry B",
                            entryTypeKey,
                            description: "Testing",
                            key: "te2b",
                        },
                    },
                    {
                        code: "CreateProperty",
                        data: {
                            key: propertyKey,
                            name: "Is A",
                            type: PropertyType.RelIsA,
                            appliesTo: [{ entryTypeKey }],
                        },
                    },
                ],
                editSource: UseSystemSource,
            }));
            // Say that (entry B) IS A (entry a)
            const valueExpression = `entry("${entryA}")`;
            const note = "B is an A";
            await graph.runAsSystem(ApplyEdits({
                siteId,
                edits: [
                    {
                        code: "AddPropertyFact",
                        data: {
                            entryId: entryB,
                            propertyKey,
                            propertyFactId: VNID(),
                            valueExpression,
                            note,
                        },
                    },
                ],
                editSource: UseSystemSource,
            }));
            // Now just read the value from the graph, so we're only testing the write functions, not the read ones:
            const result = await graph.read((tx) =>
                tx.query(C`
                MATCH (entry:${Entry} {id: ${entryB}})
                MATCH (prop:${Property} {siteNamespace: ${siteId}, key: ${propertyKey}})
                MATCH (entry)-[:${Entry.rel.PROP_FACT}]->(fact:${PropertyFact})-[:${PropertyFact.rel.FOR_PROP}]->(prop)
            `.RETURN({ fact: Field.VNode(PropertyFact) }))
            );
            assertEquals(result.length, 1);
            assertEquals(result[0].fact.valueExpression, valueExpression);
            assertEquals(result[0].fact.note, note);
            // Now check the direct relationship:
            const result2 = await graph.read((tx) =>
                tx.query(C`
                MATCH (a:${Entry} {id: ${entryA}})
                MATCH (b:${Entry} {id: ${entryB}})
                MATCH (b)-[rel:${Entry.rel.IS_A}]->(a)
            `.RETURN({ rel: Field.Relationship }))
            );
            assertEquals(result2.length, 1);
            assertEquals(result2[0].rel.identity, result[0].fact.directRelNeo4jId);
        });
    });

    group("getEntryProperty() / getEntryProperties()", () => {
        // Site ID
        const siteId = VNID();
        // Entry Type IDs:
        const entryTypeKey = "E789";
        // Entry IDs:
        const A = VNID(), B = VNID(), C = VNID();
        // Property IDs:
        const entryIsA = "p-is-a", prop1 = "p1", prop2 = "p2", prop3 = "p3";
        // Property Fact IDs:
        const factIdA1 = VNID(), factIdB1 = VNID();
        const pfBisA = VNID(), pfCisB = VNID();

        group("blank entry and single property entry", () => {
            beforeAll(async () => {
                const graph = await getGraph();
                await resetDBToBlankSnapshot();
                // Create a site with:
                //   Entry A has no properties
                //   Entry B has one property
                await graph.runAsSystem(
                    CreateSite({ id: siteId, name: "Test Site", domain: "test-site.neolace.net", key: "test" }),
                );
                await graph.runAsSystem(ApplyEdits({
                    siteId,
                    edits: [
                        { code: "CreateEntryType", data: { key: entryTypeKey, name: "EntryType" } },
                        {
                            code: "CreateEntry",
                            data: { entryId: A, name: "Entry A", entryTypeKey, key: "a", description: "" },
                        },
                        {
                            code: "CreateEntry",
                            data: { entryId: B, name: "Entry B", entryTypeKey, key: "b", description: "" },
                        },
                        {
                            code: "CreateProperty",
                            data: {
                                key: prop1,
                                name: "Property 1",
                                type: PropertyType.Value,
                                appliesTo: [{ entryTypeKey }],
                                description: "",
                            },
                        },
                        {
                            code: "AddPropertyFact",
                            data: {
                                entryId: B,
                                propertyKey: prop1,
                                propertyFactId: factIdB1,
                                valueExpression: `"value for B prop1"`,
                            },
                        },
                    ],
                    editSource: UseSystemSource,
                }));
            });

            test("Returns no properties for a blank entry", async () => {
                const graph = await getGraph();
                // Get the properties of A
                assertEquals(await graph.read((tx) => getEntryProperties(A, { tx })), [
                    // No properties
                ]);
            });

            test("Returns no properties for a blank entry (getting specific property)", async () => {
                const graph = await getGraph();
                // Get the properties of A
                assertEquals(
                    await graph.read((tx) => getEntryProperty({ entryId: A, propertyKey: prop1, tx })),
                    undefined,
                );
            });

            test("returns a basic property for an entry with a property", async () => {
                const graph = await getGraph();
                // Get the properties of B
                assertEquals(await graph.read((tx) => getEntryProperties(B, { tx })), [
                    {
                        property: {
                            key: prop1,
                            rank: 15,
                            name: "Property 1",
                            default: null,
                        },
                        facts: [
                            {
                                propertyFactId: factIdB1,
                                note: "",
                                source: { from: "ThisEntry" },
                                rank: 1,
                                valueExpression: '"value for B prop1"',
                            },
                        ],
                    },
                ]);
            });

            test("getEntryProperty() by ID", async () => {
                const graph = await getGraph();
                const allProps = await graph.read((tx) => getEntryProperties(B, { tx }));
                assertEquals(allProps.length, 1);
                const expected = allProps[0];
                assertEquals(
                    await graph.read((tx) => getEntryProperty({ entryId: B, propertyKey: expected.property.key, tx })),
                    expected,
                );
                // And if we give a random property ID, we should get no result:
                assertEquals(
                    await graph.read((tx) => getEntryProperty({ entryId: B, propertyKey: prop3, tx })),
                    undefined,
                );
            });
        });

        group("default values", () => {
            test("Automatic reverse properties can be implemented using default values", async () => {
                const graph = await getGraph();
                // Create a site where B is an A, but A has an automatic reverse property
                await resetDBToBlankSnapshot();
                const pfBisA = VNID();
                const propHasTypes = "pr-has-types";
                await graph.runAsSystem(
                    CreateSite({ id: siteId, name: "Test Site", domain: "test-site.neolace.net", key: "test" }),
                );
                await graph.runAsSystem(ApplyEdits({
                    siteId,
                    edits: [
                        { code: "CreateEntryType", data: { key: entryTypeKey, name: "EntryType" } },
                        {
                            code: "CreateProperty",
                            data: {
                                key: entryIsA,
                                name: "Type of",
                                type: PropertyType.RelIsA,
                                appliesTo: [{ entryTypeKey }],
                                description: "",
                                rank: 1,
                            },
                        },
                        // Create the automatic reverse property of "is a / type of":
                        {
                            code: "CreateProperty",
                            data: {
                                key: propHasTypes,
                                name: "Has types",
                                type: PropertyType.RelOther,
                                mode: PropertyMode.Auto,
                                appliesTo: [{ entryTypeKey }],
                                description: "",
                                rank: 1,
                                default: `this.reverse(prop=prop("${entryIsA}"))`,
                            },
                        },
                        // Create entry A:
                        {
                            code: "CreateEntry",
                            data: { entryId: A, name: "Entry A", entryTypeKey, key: "a", description: "" },
                        },
                        // Create entry B and its properties:
                        {
                            code: "CreateEntry",
                            data: { entryId: B, name: "Entry B", entryTypeKey, key: "b", description: "" },
                        },
                        {
                            code: "AddPropertyFact",
                            data: {
                                entryId: B,
                                propertyKey: entryIsA,
                                valueExpression: `entry("${A}")`,
                                note: "B is an A",
                                propertyFactId: pfBisA,
                            },
                        },
                    ],
                    editSource: UseSystemSource,
                }));

                assertEquals(await graph.read((tx) => getEntryProperties(A, { tx })), [
                    {
                        property: {
                            key: propHasTypes,
                            rank: 1,
                            name: "Has types",
                            default: `this.reverse(prop=prop("${entryIsA}"))`,
                        },
                        facts: [],
                    },
                ]);
            });
        });

        group("inheritance", () => {
            test("Returns inherited properties from parent entries, if the property is marked as inheritable", async () => {
                const graph = await getGraph();
                await resetDBToBlankSnapshot();
                // Create a site with:
                //   Entry A has prop1 = A1, prop2 = A2, prop3 = A3
                //   Entry B has             prop2 = B2
                //   Entry C has                         prop3 = C3
                //   C inherits from B which inherits from A
                //   Property 3 is not inheritable, but the others are.
                const pfA1 = VNID(), pfA2 = VNID(), pfA3 = VNID(), pfB2 = VNID(), pfC3 = VNID();
                await graph.runAsSystem(
                    CreateSite({ id: siteId, name: "Test Site", domain: "test-site.neolace.net", key: "test" }),
                );
                await graph.runAsSystem(ApplyEdits({
                    siteId,
                    edits: [
                        { code: "CreateEntryType", data: { key: entryTypeKey, name: "EntryType" } },
                        {
                            code: "CreateProperty",
                            data: {
                                key: entryIsA,
                                name: "Type of",
                                type: PropertyType.RelIsA,
                                appliesTo: [{ entryTypeKey }],
                                description: "",
                                rank: 1,
                            },
                        },
                        {
                            code: "CreateProperty",
                            data: {
                                key: prop1,
                                name: "Property 1",
                                type: PropertyType.Value,
                                appliesTo: [{ entryTypeKey }],
                                description: "",
                                inheritable: true,
                            },
                        },
                        {
                            code: "CreateProperty",
                            data: {
                                key: prop2,
                                name: "Property 2",
                                type: PropertyType.Value,
                                appliesTo: [{ entryTypeKey }],
                                description: "",
                                inheritable: true,
                            },
                        },
                        {
                            code: "CreateProperty",
                            data: {
                                key: prop3,
                                name: "Property 3",
                                type: PropertyType.Value,
                                appliesTo: [{ entryTypeKey }],
                                description: "",
                                inheritable: false,
                            },
                        },
                        // Create entry A and its properties:
                        {
                            code: "CreateEntry",
                            data: { entryId: A, name: "Entry A", entryTypeKey, key: "a", description: "" },
                        },
                        {
                            code: "AddPropertyFact",
                            data: {
                                entryId: A,
                                propertyKey: prop1,
                                valueExpression: `"A1"`,
                                propertyFactId: pfA1,
                            },
                        },
                        {
                            code: "AddPropertyFact",
                            data: {
                                entryId: A,
                                propertyKey: prop2,
                                valueExpression: `"A2"`,
                                propertyFactId: pfA2,
                            },
                        },
                        {
                            code: "AddPropertyFact",
                            data: {
                                entryId: A,
                                propertyKey: prop3,
                                valueExpression: `"A3"`,
                                propertyFactId: pfA3,
                            },
                        },
                        // Create entry B and its properties:
                        {
                            code: "CreateEntry",
                            data: { entryId: B, name: "Entry B", entryTypeKey, key: "b", description: "" },
                        },
                        {
                            code: "AddPropertyFact",
                            data: {
                                entryId: B,
                                propertyKey: entryIsA,
                                valueExpression: `entry("${A}")`,
                                note: "B is an A",
                                propertyFactId: pfBisA,
                            },
                        },
                        {
                            code: "AddPropertyFact",
                            data: {
                                entryId: B,
                                propertyKey: prop2,
                                valueExpression: `"B2"`,
                                propertyFactId: pfB2,
                            },
                        },
                        // Create entry C and its properties:
                        {
                            code: "CreateEntry",
                            data: { entryId: C, name: "Entry C", entryTypeKey, key: "c", description: "" },
                        },
                        {
                            code: "AddPropertyFact",
                            data: {
                                entryId: C,
                                propertyKey: entryIsA,
                                valueExpression: `entry("${B}")`,
                                note: "C is a B",
                                propertyFactId: pfCisB,
                            },
                        },
                        {
                            code: "AddPropertyFact",
                            data: {
                                entryId: C,
                                propertyKey: prop3,
                                valueExpression: `"C3"`,
                                propertyFactId: pfC3,
                            },
                        },
                    ],
                    editSource: UseSystemSource,
                }));

                // Define the expected property values:
                const expectedPropValue = (
                    propKey: string,
                    propertyFactId: VNID,
                    value: string,
                    source: { from: "ThisEntry" } | { from: "AncestorEntry"; entryId: VNID } = { from: "ThisEntry" },
                ) => {
                    return {
                        property: {
                            key: propKey,
                            rank: 15,
                            name: `Property ${
                                propKey === prop1 ? "1" : propKey === prop2 ? "2" : propKey === prop3 ? "3" : "X"
                            }`,
                            default: null,
                        },
                        facts: [{
                            propertyFactId,
                            note: "",
                            source,
                            rank: 1,
                            valueExpression: `"${value}"`,
                        }],
                    };
                };

                // Get the properties of A
                assertEquals(await graph.read((tx) => getEntryProperties(A, { tx })), [
                    expectedPropValue(prop1, pfA1, "A1"),
                    expectedPropValue(prop2, pfA2, "A2"),
                    expectedPropValue(prop3, pfA3, "A3"),
                ]);

                // Get the properties of B
                assertEquals(await graph.read((tx) => getEntryProperties(B, { tx })), [
                    // B is an A
                    {
                        property: { key: entryIsA, rank: 1, name: "Type of", default: null },
                        facts: [{
                            propertyFactId: pfBisA,
                            note: "B is an A",
                            valueExpression: `entry("${A}")`,
                            source: { from: "ThisEntry" },
                            rank: 1,
                        }],
                    },
                    // value A1 is inherited from Entry A, this entry's parent:
                    expectedPropValue(prop1, pfA1, "A1", { from: "AncestorEntry", entryId: A }),
                    // value B2 is set directly on this Entry B, and so A2 will not be inherited
                    expectedPropValue(prop2, pfB2, "B2"),
                    // A3 is NOT inherited because we marked property 3 as non-inheritable.
                ]);

                // Get the properties of C
                assertEquals(await graph.read((tx) => getEntryProperties(C, { tx })), [
                    // C is a B
                    {
                        property: { key: entryIsA, rank: 1, name: "Type of", default: null },
                        facts: [{
                            propertyFactId: pfCisB,
                            note: "C is a B",
                            valueExpression: `entry("${B}")`,
                            source: { from: "ThisEntry" },
                            rank: 1,
                        }],
                    },
                    // value A1 is inherited from Entry A, this entry's grandparent:
                    expectedPropValue(prop1, pfA1, "A1", { from: "AncestorEntry", entryId: A }),
                    expectedPropValue(prop2, pfB2, "B2", { from: "AncestorEntry", entryId: B }),
                    expectedPropValue(prop3, pfC3, "C3"),
                ]);
            });
        });

        group("multiple property values", () => {
            test("test multiple values for a single property", async () => {
                const graph = await getGraph();
                await resetDBToBlankSnapshot();
                // Create a site with:
                //   Entry A has one property with one value
                //   Entry B inherits from A and has the same property with *TWO VALUES*
                //   Entry C inherits from B and has no direct properties.
                const factIdB1v1 = VNID(), factIdB1v2 = VNID();
                await graph.runAsSystem(
                    CreateSite({ id: siteId, name: "Test Site", domain: "test-site.neolace.net", key: "test" }),
                );
                await graph.runAsSystem(ApplyEdits({
                    siteId,
                    edits: [
                        { code: "CreateEntryType", data: { key: entryTypeKey, name: "EntryType" } },
                        {
                            code: "CreateProperty",
                            data: {
                                key: entryIsA,
                                name: "Type of",
                                type: PropertyType.RelIsA,
                                appliesTo: [{ entryTypeKey }],
                                description: "",
                                rank: 1,
                            },
                        },
                        {
                            code: "CreateProperty",
                            data: {
                                key: prop1,
                                name: "Property 1",
                                type: PropertyType.Value,
                                appliesTo: [{ entryTypeKey }],
                                description: "",
                                inheritable: true,
                            },
                        },
                        // Create A
                        {
                            code: "CreateEntry",
                            data: { entryId: A, name: "Entry A", entryTypeKey, key: "a", description: "" },
                        },
                        {
                            code: "AddPropertyFact",
                            data: {
                                entryId: A,
                                propertyKey: prop1,
                                propertyFactId: factIdA1,
                                valueExpression: `"value for A prop1"`,
                            },
                        },
                        // Create B
                        {
                            code: "CreateEntry",
                            data: { entryId: B, name: "Entry B", entryTypeKey, key: "b", description: "" },
                        },
                        // B inherits from A
                        {
                            code: "AddPropertyFact",
                            data: {
                                entryId: B,
                                propertyKey: entryIsA,
                                propertyFactId: pfBisA,
                                valueExpression: `entry("${A}")`,
                            },
                        },
                        {
                            code: "AddPropertyFact",
                            data: {
                                entryId: B,
                                propertyKey: prop1,
                                propertyFactId: factIdB1v1,
                                valueExpression: `"value 1 for B prop1"`,
                                note: "first",
                            },
                        },
                        {
                            code: "AddPropertyFact",
                            data: {
                                entryId: B,
                                propertyKey: prop1,
                                propertyFactId: factIdB1v2,
                                valueExpression: `"value 2 for B prop1"`,
                                note: "second",
                            },
                        },
                        // Create C
                        {
                            code: "CreateEntry",
                            data: { entryId: C, name: "Entry C", entryTypeKey, key: "c", description: "" },
                        },
                        // C inherits from B
                        {
                            code: "AddPropertyFact",
                            data: {
                                entryId: C,
                                propertyKey: entryIsA,
                                propertyFactId: pfCisB,
                                valueExpression: `entry("${B}")`,
                            },
                        },
                    ],
                    editSource: UseSystemSource,
                }));
                // Check properties of B:
                assertEquals(
                    await graph.read((tx) => getEntryProperty({ entryId: B, propertyKey: prop1, tx })),
                    {
                        property: {
                            key: prop1,
                            name: "Property 1",
                            rank: 15,
                            default: null,
                        },
                        facts: [
                            {
                                propertyFactId: factIdB1v1,
                                valueExpression: `"value 1 for B prop1"`,
                                note: "first",
                                source: { from: "ThisEntry" },
                                rank: 1,
                            },
                            {
                                propertyFactId: factIdB1v2,
                                valueExpression: `"value 2 for B prop1"`,
                                note: "second",
                                source: { from: "ThisEntry" },
                                rank: 2,
                            },
                        ],
                    },
                );
                // Check properties of C (inherited):
                assertEquals(
                    await graph.read((tx) => getEntryProperty({ entryId: C, propertyKey: prop1, tx })),
                    {
                        property: {
                            key: prop1,
                            name: "Property 1",
                            rank: 15,
                            default: null,
                        },
                        facts: [
                            // Note that "rank" will be set automatically:
                            {
                                rank: 1,
                                propertyFactId: factIdB1v1,
                                valueExpression: `"value 1 for B prop1"`,
                                note: "first",
                                source: { from: "AncestorEntry", entryId: B },
                            },
                            {
                                rank: 2,
                                propertyFactId: factIdB1v2,
                                valueExpression: `"value 2 for B prop1"`,
                                note: "second",
                                source: { from: "AncestorEntry", entryId: B },
                            },
                        ],
                    },
                );
            });

            test("property rank can be used to explicitly order properties", async () => {
                const graph = await getGraph();
                await resetDBToBlankSnapshot();
                // Create a site with:
                //   Entry A has one property with three values in a specific order
                const factIdA1v1 = VNID(), factIdA1v2 = VNID(), factIdA1v3 = VNID();
                await graph.runAsSystem(
                    CreateSite({ id: siteId, name: "Test Site", domain: "test-site.neolace.net", key: "test" }),
                );
                await graph.runAsSystem(ApplyEdits({
                    siteId,
                    edits: [
                        { code: "CreateEntryType", data: { key: entryTypeKey, name: "EntryType" } },
                        {
                            code: "CreateProperty",
                            data: {
                                key: prop1,
                                name: "Property 1",
                                type: PropertyType.Value,
                                appliesTo: [{ entryTypeKey }],
                                description: "",
                                inheritable: true,
                            },
                        },
                        // Create A
                        {
                            code: "CreateEntry",
                            data: { entryId: A, name: "Entry A", entryTypeKey, key: "a", description: "" },
                        },
                        {
                            code: "AddPropertyFact",
                            data: {
                                entryId: A,
                                propertyKey: prop1,
                                propertyFactId: factIdA1v2,
                                valueExpression: `"value 2 for A prop1"`,
                                note: "second but added first",
                                rank: 2,
                            },
                        },
                        {
                            code: "AddPropertyFact",
                            data: {
                                entryId: A,
                                propertyKey: prop1,
                                propertyFactId: factIdA1v3,
                                valueExpression: `"value 3 for A prop1"`,
                                note: "third but added second",
                                rank: 3,
                            },
                        },
                        {
                            code: "AddPropertyFact",
                            data: {
                                entryId: A,
                                propertyKey: prop1,
                                propertyFactId: factIdA1v1,
                                valueExpression: `"value 1 for A prop1"`,
                                note: "first but added third",
                                rank: 1,
                            },
                        },
                    ],
                    editSource: UseSystemSource,
                }));
                // Check properties of A:
                assertEquals(
                    await graph.read((tx) => getEntryProperty({ entryId: A, propertyKey: prop1, tx })),
                    {
                        property: { key: prop1, name: "Property 1", rank: 15, default: null },
                        facts: [
                            {
                                propertyFactId: factIdA1v1,
                                valueExpression: `"value 1 for A prop1"`,
                                note: "first but added third",
                                rank: 1,
                                source: { from: "ThisEntry" },
                            },
                            {
                                propertyFactId: factIdA1v2,
                                valueExpression: `"value 2 for A prop1"`,
                                note: "second but added first",
                                rank: 2,
                                source: { from: "ThisEntry" },
                            },
                            {
                                propertyFactId: factIdA1v3,
                                valueExpression: `"value 3 for A prop1"`,
                                note: "third but added second",
                                rank: 3,
                                source: { from: "ThisEntry" },
                            },
                        ],
                    },
                );
            });
        });

        group("slots", () => {
            const componentTypeKey = "ETCOMPONENT";
            const entryHasPart = "has-part";
            const steeringWheel = VNID(),
                combustionEngine = VNID(),
                electricMotor = VNID(),
                car = VNID(),
                electricCar = VNID();
            const pfCarHasWheel = VNID(),
                pfCarhasEngine = VNID(),
                pfElectricCarIsCar = VNID(),
                pfElectricCarHasMotor = VNID();
            beforeAll(async () => {
                const graph = await getGraph();
                await resetDBToBlankSnapshot();
                // Create a site with:
                //   Entries "Steering Wheel", "Combustion Engine", "Electric Motor"
                //   Entry "Car" has part "Steering Wheel" in slot "sw", "Combustion Engine" in slot "motor"
                //   Entry "Electric Car" inherits from "Car" and has part "Electic Motor" in slot "motor"
                await graph.runAsSystem(
                    CreateSite({ id: siteId, name: "Test Site", domain: "test-site.neolace.net", key: "test" }),
                );
                await graph.runAsSystem(ApplyEdits({
                    siteId,
                    edits: [
                        { code: "CreateEntryType", data: { key: entryTypeKey, name: "Vehicle" } },
                        { code: "CreateEntryType", data: { key: componentTypeKey, name: "Component" } },
                        // Create relationship properties:
                        {
                            code: "CreateProperty",
                            data: {
                                key: entryIsA,
                                name: "Type of",
                                type: PropertyType.RelIsA,
                                appliesTo: [{ entryTypeKey }],
                                description: "",
                                rank: 1,
                            },
                        },
                        {
                            code: "CreateProperty",
                            data: {
                                key: entryHasPart,
                                name: "Has Part",
                                type: PropertyType.RelOther,
                                appliesTo: [{ entryTypeKey }],
                                description: "",
                                rank: 2,
                                inheritable: true,
                                enableSlots: true,
                            },
                        },
                        // Create "component" entries:
                        {
                            code: "CreateEntry",
                            data: {
                                entryId: steeringWheel,
                                name: "Steering Wheel",
                                entryTypeKey: componentTypeKey,
                                key: "c-sw",
                                description: "",
                            },
                        },
                        {
                            code: "CreateEntry",
                            data: {
                                entryId: combustionEngine,
                                name: "Combustion Engine",
                                entryTypeKey: componentTypeKey,
                                key: "c-ce",
                                description: "",
                            },
                        },
                        {
                            code: "CreateEntry",
                            data: {
                                entryId: electricMotor,
                                name: "Electric Motor",
                                entryTypeKey: componentTypeKey,
                                key: "c-em",
                                description: "",
                            },
                        },
                        // Create entry "Car": has part "Steering Wheel" in slot "sw", "Combustion Engine" in slot "motor"
                        {
                            code: "CreateEntry",
                            data: { entryId: car, name: "Car", entryTypeKey, key: "v-car", description: "" },
                        },
                        {
                            code: "AddPropertyFact",
                            data: {
                                entryId: car,
                                propertyKey: entryHasPart,
                                slot: "sw",
                                valueExpression: `entry("${steeringWheel}")`,
                                note: "wheel",
                                propertyFactId: pfCarHasWheel,
                            },
                        },
                        {
                            code: "AddPropertyFact",
                            data: {
                                entryId: car,
                                propertyKey: entryHasPart,
                                slot: "motor",
                                valueExpression: `entry("${combustionEngine}")`,
                                note: "engine",
                                propertyFactId: pfCarhasEngine,
                            },
                        },
                        // Create entry "Electric Car": has part "Electric Motor" in slot "motor"
                        {
                            code: "CreateEntry",
                            data: {
                                entryId: electricCar,
                                name: "Electric Car",
                                entryTypeKey,
                                key: "v-e-car",
                                description: "",
                            },
                        },
                        {
                            code: "AddPropertyFact",
                            data: {
                                entryId: electricCar,
                                propertyKey: entryIsA,
                                valueExpression: `entry("${car}")`,
                                note: "wheel",
                                propertyFactId: pfElectricCarIsCar,
                            },
                        },
                        {
                            code: "AddPropertyFact",
                            data: {
                                entryId: electricCar,
                                propertyKey: entryHasPart,
                                slot: "motor",
                                valueExpression: `entry("${electricMotor}")`,
                                note: "motor",
                                propertyFactId: pfElectricCarHasMotor,
                            },
                        },
                    ],
                    editSource: UseSystemSource,
                }));
            });
            test("'slots' allow partial inheritance where _some_ inherited values get overwritten, others don't.", async () => {
                const graph = await getGraph();
                // Car is normal, has two parts:
                assertEquals(
                    await graph.read((tx) => getEntryProperty({ entryId: car, propertyKey: entryHasPart, tx })),
                    {
                        property: { key: entryHasPart, name: "Has Part", rank: 2, default: null },
                        facts: [
                            // These are sorted in alphabetical order by slot so "motor" comes before "sw" (steering wheel)
                            {
                                propertyFactId: pfCarhasEngine,
                                valueExpression: `entry("${combustionEngine}")`,
                                note: "engine",
                                slot: "motor",
                                rank: 2,
                                source: { from: "ThisEntry" },
                            },
                            {
                                propertyFactId: pfCarHasWheel,
                                valueExpression: `entry("${steeringWheel}")`,
                                note: "wheel",
                                slot: "sw",
                                rank: 1,
                                source: { from: "ThisEntry" },
                            },
                        ],
                    },
                );

                // Now with slots enabled, electric car should have "steering wheel" (inherited), and "Electric Motor" but not "Combustion Engine"
                // Slots allow partial inheritance of "steering wheel", while "combustion engine" gets overwritten
                assertEquals(
                    await graph.read((tx) => getEntryProperty({ entryId: electricCar, propertyKey: entryHasPart, tx })),
                    {
                        property: { key: entryHasPart, name: "Has Part", rank: 2, default: null },
                        facts: [
                            {
                                propertyFactId: pfElectricCarHasMotor,
                                valueExpression: `entry("${electricMotor}")`,
                                note: "motor",
                                slot: "motor",
                                rank: 1,
                                source: { from: "ThisEntry" },
                            },
                            {
                                propertyFactId: pfCarHasWheel,
                                valueExpression: `entry("${steeringWheel}")`,
                                note: "wheel",
                                slot: "sw",
                                rank: 1,
                                source: { from: "AncestorEntry", entryId: car },
                            },
                        ],
                    },
                );
            });
            test("slots can be disabled, even after slot values were set", async () => {
                const graph = await getGraph();
                await graph.runAsSystem(ApplyEdits({
                    siteId,
                    edits: [
                        {
                            code: "UpdateProperty",
                            data: {
                                key: entryHasPart,
                                enableSlots: false,
                            },
                        },
                    ],
                    editSource: UseSystemSource,
                }));
                // Now with slots disabled, electric car won't inherit steering wheel, because having any value for
                // "has parts" will override ALL inherited values.
                assertEquals(
                    await graph.read((tx) => getEntryProperty({ entryId: electricCar, propertyKey: entryHasPart, tx })),
                    {
                        property: { key: entryHasPart, name: "Has Part", rank: 2, default: null },
                        facts: [
                            // However, slot values are still returned, since they are set:
                            {
                                propertyFactId: pfElectricCarHasMotor,
                                valueExpression: `entry("${electricMotor}")`,
                                note: "motor",
                                slot: "motor",
                                rank: 1,
                                source: { from: "ThisEntry" },
                            },
                        ],
                    },
                );
            });
        });

        test("Can paginate, filter, and provide total count of properties", async () => {
            const graph = await getGraph();
            await resetDBToBlankSnapshot();
            // Create a site with:
            //   Entry A has 10 properties [and 5 non-editable Auto values that all entries of that type have]
            //   Entry B has 30 properties [and 5 non-editable Auto values that all entries of that type have]
            //   B inherits 8 properties from A, but overwrites 2 of them so only 6 are inherited
            //   B also has 1 "is a" property to define its relationship to A
            //
            //   So: A has 15 properties total (10 + 5)
            //       B has 42 properties total (30 + 5 + 6 + 1)
            await graph.runAsSystem(
                CreateSite({ id: siteId, name: "Test Site", domain: "test-site.neolace.net", key: "test" }),
            );
            await graph.runAsSystem(ApplyEdits({
                siteId,
                edits: [
                    { code: "CreateEntryType", data: { key: entryTypeKey, name: "EntryType" } },
                    {
                        code: "CreateProperty",
                        data: {
                            key: entryIsA,
                            name: "Is a",
                            type: PropertyType.RelIsA,
                            appliesTo: [{ entryTypeKey }],
                            description: "",
                            rank: 99,
                        },
                    },
                    // Create entry A and B:
                    {
                        code: "CreateEntry",
                        data: { entryId: A, name: "Entry A", entryTypeKey, key: "a", description: "" },
                    },
                    {
                        code: "CreateEntry",
                        data: { entryId: B, name: "Entry B", entryTypeKey, key: "b", description: "" },
                    },
                    // B inherits from A:
                    {
                        code: "AddPropertyFact",
                        data: {
                            entryId: B,
                            propertyKey: entryIsA,
                            propertyFactId: pfBisA,
                            valueExpression: `entry("${A}")`,
                        },
                    },
                ],
                editSource: UseSystemSource,
            }));

            const edits: EditList = [];

            // Create 5 non-editable Auto values that all entries of that type have:
            const autoPropertyValues: EntryPropertyValueSet[] = [];
            for (let i = 0; i < 5; i++) {
                const key = `P${i}`;
                const args = {
                    key,
                    name: `Auto Property ${i}`,
                    rank: i,
                    default: `"AutoProp${i} value"`,
                };
                edits.push({
                    code: "CreateProperty",
                    data: { appliesTo: [{ entryTypeKey }], description: "", mode: PropertyMode.Auto, ...args },
                });
                autoPropertyValues.push({
                    property: { ...args },
                    facts: [],
                });
            }

            // Create 10 property values on entry A, the first 8 of which are inheritable
            const aPropertyValues: EntryPropertyValueSet[] = [];
            for (let i = 0; i < 10; i++) {
                const key = `PA${i}`;
                const propArgs = {
                    key,
                    name: `Property ${i}`,
                    rank: i,
                };
                edits.push({
                    code: "CreateProperty",
                    data: { ...propArgs, appliesTo: [{ entryTypeKey }], description: "", inheritable: i < 8 },
                });
                const propertyFactId = VNID();
                edits.push({
                    code: "AddPropertyFact",
                    data: { entryId: A, propertyKey: key, propertyFactId, valueExpression: `"A${i}"` },
                });
                aPropertyValues.push({
                    property: { ...propArgs, default: null },
                    facts: [{
                        propertyFactId,
                        valueExpression: `"A${i}"`,
                        note: "",
                        rank: 1,
                        source: { from: "ThisEntry" },
                    }],
                });
            }

            // B will inherit eight properties (0..7) from A, but will overwrite two of them:
            const factIdB6 = VNID();
            edits.push({
                code: "AddPropertyFact",
                data: {
                    entryId: B,
                    propertyKey: aPropertyValues[6].property.key,
                    propertyFactId: factIdB6,
                    valueExpression: `"B6"`,
                },
            });
            const factIdB7 = VNID();
            edits.push({
                code: "AddPropertyFact",
                data: {
                    entryId: B,
                    propertyKey: aPropertyValues[7].property.key,
                    propertyFactId: factIdB7,
                    valueExpression: `"B7"`,
                },
            });
            // In addition to those two overwritten properties, B has 28 other properties set:
            const bPropertyValues = [];
            for (let i = 0; i < 28; i++) {
                const key = `PB${i}`;
                const propArgs = {
                    key,
                    name: `B Property ${i}`,
                    rank: 20 + i,
                };
                edits.push({
                    code: "CreateProperty",
                    data: { ...propArgs, appliesTo: [{ entryTypeKey }], description: "" },
                });
                const propertyFactId = VNID();
                edits.push({
                    code: "AddPropertyFact",
                    data: { entryId: B, propertyKey: key, propertyFactId, valueExpression: `"B${i}"` },
                });
                bPropertyValues.push({
                    property: { ...propArgs, default: null },
                    facts: [{
                        propertyFactId,
                        valueExpression: `"B${i}"`,
                        note: "",
                        rank: 1,
                        source: { from: "ThisEntry" },
                    }],
                });
            }

            await graph.runAsSystem(ApplyEdits({ siteId, edits, editSource: UseSystemSource }));

            // Get the properties of A with rank <= 2:
            assertEquals(await graph.read((tx) => getEntryProperties(A, { tx, maxRank: 2 })), [
                // Results are sorted by rank, and by label.
                autoPropertyValues[0],
                aPropertyValues[0],
                autoPropertyValues[1],
                aPropertyValues[1],
                autoPropertyValues[2],
                aPropertyValues[2],
            ]);

            // Now get same as above but SKIP the first two and LIMIT to 3 results, and include the total count.
            {
                const result = await graph.read((tx) =>
                    getEntryProperties(A, { tx, skip: 2, limit: 3, totalCount: true, maxRank: 2 })
                );
                assertEquals(result.slice(), [ // Use slice to discard the totalCount info which otherwise counts as a difference
                    autoPropertyValues[1],
                    aPropertyValues[1],
                    autoPropertyValues[2],
                ]);
                assertEquals(result.totalCount, 6);
            }

            // Helper to generate the expected results for B based on the ones from A:
            const updateExpectedFact = (input: { facts: { source: unknown }[] }, updates: Record<string, unknown>) => {
                const newData = { ...input };
                newData.facts[0] = { ...input.facts[0], ...updates };
                return input;
            };

            // Get the first ten properties of B, and the total count
            {
                const result = await graph.read((tx) => getEntryProperties(B, { tx, limit: 16, totalCount: true }));
                assertEquals(result.slice(), [ // Use slice to discard the totalCount info which otherwise counts as a difference
                    // B inherits 8 properties from A, but overwrites 2 of them so only 6 are inherited,
                    // but also has autoPropertyValues interleaved
                    autoPropertyValues[0],
                    updateExpectedFact(aPropertyValues[0], { source: { from: "AncestorEntry", entryId: A } }),
                    autoPropertyValues[1],
                    updateExpectedFact(aPropertyValues[1], { source: { from: "AncestorEntry", entryId: A } }),
                    autoPropertyValues[2],
                    updateExpectedFact(aPropertyValues[2], { source: { from: "AncestorEntry", entryId: A } }),
                    autoPropertyValues[3],
                    updateExpectedFact(aPropertyValues[3], { source: { from: "AncestorEntry", entryId: A } }),
                    autoPropertyValues[4],
                    updateExpectedFact(aPropertyValues[4], { source: { from: "AncestorEntry", entryId: A } }),
                    updateExpectedFact(aPropertyValues[5], { source: { from: "AncestorEntry", entryId: A } }),
                    updateExpectedFact(aPropertyValues[6], {
                        propertyFactId: factIdB6,
                        valueExpression: `"B6"`,
                        source: { from: "ThisEntry" },
                    }), // B overrides inherited property 6
                    updateExpectedFact(aPropertyValues[7], {
                        propertyFactId: factIdB7,
                        valueExpression: `"B7"`,
                        source: { from: "ThisEntry" },
                    }), // B overrides inherited property 7
                    bPropertyValues[0],
                    bPropertyValues[1],
                    bPropertyValues[2],
                ]);
                // Check that the total count matches the actual results if we fetch them all
                assertEquals((await graph.read((tx) => getEntryProperties(B, { tx }))).length, result.totalCount);
                assertEquals(result.totalCount, 42);
            }
        });

        // TODO: test the dbHits performance of getProperties()
    });

    group("getEntriesProperty - get a property from multiple entries", () => {
        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);

        test("getEntriesProperty() can retrieve a single property from multiple entries", async () => {
            const graph = await getGraph();
            const entryIds = [
                defaultData.entries.ponderosaPine.id,
                defaultData.entries.jackPine.id,
                defaultData.entries.japaneseRedPine.id,
            ];
            const propertyKey = defaultData.schema.properties.propScientificName.key;
            const result = await graph.read((tx) => getEntriesProperty(tx, entryIds, propertyKey));
            assertEquals(result.length, 3);

            const property = {
                key: propertyKey,
                name: defaultData.schema.properties.propScientificName.name,
                rank: defaultData.schema.properties.propScientificName.rank,
                displayAs: defaultData.schema.properties.propScientificName.displayAs,
                default: null,
            };

            const ponderosaResult = result.find((r) => r.entryId === defaultData.entries.ponderosaPine.id);
            assertEquals(ponderosaResult, {
                entryId: defaultData.entries.ponderosaPine.id,
                property,
                facts: [{
                    propertyFactId: ponderosaResult?.facts[0].propertyFactId as VNID,
                    valueExpression: `"Pinus ponderosa"`,
                    note: "",
                    rank: 1,
                    source: { from: "ThisEntry" },
                }],
            });

            const jackPineResult = result.find((r) => r.entryId === defaultData.entries.jackPine.id);
            assertEquals(jackPineResult, {
                entryId: defaultData.entries.jackPine.id,
                property,
                facts: [{
                    propertyFactId: jackPineResult?.facts[0].propertyFactId as VNID,
                    valueExpression: `"Pinus banksiana"`,
                    note: "",
                    rank: 1,
                    source: { from: "ThisEntry" },
                }],
            });

            const redPineResult = result.find((r) => r.entryId === defaultData.entries.japaneseRedPine.id);
            assertEquals(redPineResult, {
                entryId: defaultData.entries.japaneseRedPine.id,
                property,
                facts: [{
                    propertyFactId: redPineResult?.facts[0].propertyFactId as VNID,
                    valueExpression: `"Pinus densiflora"`,
                    note: "",
                    rank: 1,
                    source: { from: "ThisEntry" },
                }],
            });
        });
    });
});
