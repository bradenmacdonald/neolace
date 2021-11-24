import { C, Field, VNID } from "neolace/deps/vertex-framework.ts";
import { PropertyType, PropertyMode, EditList } from "neolace/deps/neolace-api.ts";

import { group, test, resetDBToBlankSnapshot, assertEquals, beforeAll } from "neolace/lib/tests.ts";
import { graph } from "neolace/core/graph.ts";
import { CreateSite } from "neolace/core/Site.ts";
import { ApplyEdits } from "neolace/core/edit/ApplyEdits.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { Property } from "neolace/core/schema/Property.ts";
import { PropertyFact } from "neolace/core/entry/PropertyFact.ts";
import { getEntryProperties, getEntryProperty, EntryPropertyValueSet } from "neolace/core/entry/properties.ts";

group(import.meta, () => {

    group("set property values", () => {
        const entryType = VNID();
        const siteId = VNID();
        beforeAll(async () => {
            await resetDBToBlankSnapshot();
            // Create a site and an entry type:
            await graph.runAsSystem(CreateSite({
                id: siteId,
                name: "Test Site",
                domain: "test-site.neolace.net",
                slugId: "site-test",
            }));
            await graph.runAsSystem(ApplyEdits({siteId, edits: [
                {code: "CreateEntryType", data: {id: entryType, name: "EntryType"}},
            ]}));
        });

        test("Define a new value property and set it on an entry", async () => {
            const entryId = VNID();
            const propertyId = VNID();
            await graph.runAsSystem(ApplyEdits({siteId, edits: [
                {code: "CreateEntry", data: {id: entryId, name: "Entry", type: entryType, description: "Testing", friendlyId: "te1"}},
                {code: "CreateProperty", data: {id: propertyId, name: "Property", appliesTo: [{entryType}]}},
            ]}));
            await graph.runAsSystem(ApplyEdits({siteId, edits: [
                {code: "AddPropertyValue", data: {
                    entry: entryId,
                    property: propertyId,
                    propertyFactId: VNID(),
                    valueExpression: `"the value"`,
                    note: "",
                }},
            ]}));
            // Now just read the value from the graph, so we're only testing the write functions, not the read ones:
            const result = await graph.read(tx => tx.query(C`
                MATCH (entry:${Entry} {id: ${entryId}})
                MATCH (prop:${Property} {id: ${propertyId}})
                MATCH (entry)-[:${Entry.rel.PROP_FACT}]->(fact:${PropertyFact})-[:${PropertyFact.rel.FOR_PROP}]->(prop)
            `.RETURN({fact: Field.VNode(PropertyFact)})));
            assertEquals(result.length, 1);
            assertEquals(result[0].fact.valueExpression, `"the value"`);
            assertEquals(result[0].fact.note, "");
            assertEquals(result[0].fact.directRelNeo4jId, null);  // Only set for relationship properties
        });

        test("Define a new relationship property and set it on an entry", async () => {
            const entryA = VNID(), entryB = VNID();
            const propertyId = VNID();
            await graph.runAsSystem(ApplyEdits({siteId, edits: [
                {code: "CreateEntry", data: {id: entryA, name: "Entry A", type: entryType, description: "Testing", friendlyId: "te2a"}},
                {code: "CreateEntry", data: {id: entryB, name: "Entry B", type: entryType, description: "Testing", friendlyId: "te2b"}},
                {code: "CreateProperty", data: {
                    id: propertyId,
                    name: "Is A",
                    type: PropertyType.RelIsA,
                    appliesTo: [{entryType}],
                }},
            ]}));
            // Say that (entry B) IS A (entry a)
            const valueExpression = `[[/entry/${entryA}]]`;
            const note = "B is an A";
            await graph.runAsSystem(ApplyEdits({siteId, edits: [
                {code: "AddPropertyValue", data: {
                    entry: entryB,
                    property: propertyId,
                    propertyFactId: VNID(),
                    valueExpression,
                    note,
                }},
            ]}));
            // Now just read the value from the graph, so we're only testing the write functions, not the read ones:
            const result = await graph.read(tx => tx.query(C`
                MATCH (entry:${Entry} {id: ${entryB}})
                MATCH (prop:${Property} {id: ${propertyId}})
                MATCH (entry)-[:${Entry.rel.PROP_FACT}]->(fact:${PropertyFact})-[:${PropertyFact.rel.FOR_PROP}]->(prop)
            `.RETURN({fact: Field.VNode(PropertyFact)})));
            assertEquals(result.length, 1);
            assertEquals(result[0].fact.valueExpression, valueExpression);
            assertEquals(result[0].fact.note, note);
            // Now check the direct relationship:
            const result2 = await graph.read(tx => tx.query(C`
                MATCH (a:${Entry} {id: ${entryA}})
                MATCH (b:${Entry} {id: ${entryB}})
                MATCH (b)-[rel:${Entry.rel.IS_A}]->(a)
            `.RETURN({rel: Field.Relationship})));
            assertEquals(result2.length, 1);
            assertEquals(result2[0].rel.identity, result[0].fact.directRelNeo4jId);
        });
    });

    
    group("getEntryProperty() / getEntryProperties()", () => {
        // Entry Type IDs:
        const entryType = VNID();
        // Entry IDs:
        const A = VNID(), B = VNID(), C = VNID();
        // Property IDs:
        const entryIsA = VNID(), prop1 = VNID(), prop2 = VNID(), prop3 = VNID();
        // Property Fact IDs:
        const factIdA1 = VNID(), factIdB1 = VNID();
        const pfBisA = VNID(), pfCisB = VNID();

        group("blank entry and single property entry", () => {
            beforeAll(async () => {
                await resetDBToBlankSnapshot();
                // Create a site with:
                //   Entry A has no properties
                //   Entry B has one property
                const {id: siteId} = await graph.runAsSystem(CreateSite({name: "Test Site", domain: "test-site.neolace.net", slugId: "site-test"}));
                await graph.runAsSystem(ApplyEdits({siteId, edits: [
                    {code: "CreateEntryType", data: {id: entryType, name: "EntryType"}},
                    {code: "CreateEntry", data: {id: A, name: "Entry A", type: entryType, friendlyId: "a", description: ""}},
                    {code: "CreateEntry", data: {id: B, name: "Entry B", type: entryType, friendlyId: "b", description: ""}},
                    {code: "CreateProperty", data: {id: prop1, name: "Property 1", type: PropertyType.Value, appliesTo: [{entryType}], descriptionMD: ""}},
                    {code: "AddPropertyValue", data: {entry: B, property: prop1, propertyFactId: factIdB1, valueExpression: `"value for B prop1"`, note: ""}},
                ]}));
            });

            test("Returns no properties for a blank entry", async () => {
                // Get the properties of A
                assertEquals(await graph.read(tx => getEntryProperties(A, {tx})), [
                    // No properties
                ]);
            });

            test("Returns no properties for a blank entry (getting specific property)", async () => {
                // Get the properties of A
                assertEquals(await graph.read(tx => getEntryProperty({entryId: A, propertyId: prop1, tx})), undefined);
            });

            test("returns a basic property for an entry with a property", async () => {
                // Get the properties of B
                assertEquals(await graph.read(tx => getEntryProperties(B, {tx})), [
                    {
                        property: {
                            id: prop1,
                            importance: 15,
                            name: "Property 1",
                            default: null,
                        },
                        facts: [
                            {
                                factId: factIdB1,
                                note: "",
                                source: {from: "ThisEntry"},
                                rank: 1,
                                valueExpression: '"value for B prop1"',
                            },
                        ],
                    },
                ]);
            });

            test("getEntryProperty() by ID", async () => {
                const allProps = await graph.read(tx => getEntryProperties(B, {tx}));
                assertEquals(allProps.length, 1);
                const expected = allProps[0];
                assertEquals(
                    await graph.read(tx => getEntryProperty({entryId: B, propertyId: expected.property.id, tx})),
                    expected,
                );
                // And if we give a random property ID, we should get no result:
                assertEquals(
                    await graph.read(tx => getEntryProperty({entryId: B, propertyId: prop3, tx})),
                    undefined,
                );
            });
        });

        group("default values", () => {
            test("Automatic reverse properties can be implemented using default values", async () => {
                // Create a site where B is an A, but A has an automatic reverse property
                await resetDBToBlankSnapshot();
                const pfBisA = VNID();
                const propHasTypes = VNID();
                const {id: siteId} = await graph.runAsSystem(CreateSite({name: "Test Site", domain: "test-site.neolace.net", slugId: "site-test"}));
                await graph.runAsSystem(ApplyEdits({siteId, edits: [
                    {code: "CreateEntryType", data: {id: entryType, name: "EntryType"}},
                    {code: "CreateProperty", data: {
                        id: entryIsA, name: "Type of", type: PropertyType.RelIsA, appliesTo: [{entryType}], descriptionMD: "", importance: 1,
                    }},
                    // Create the automatic reverse property of "is a / type of":
                    {code: "CreateProperty", data: {
                        id: propHasTypes, name: "Has types", type: PropertyType.RelOther, mode: PropertyMode.Auto, appliesTo: [{entryType}], descriptionMD: "", importance: 1,
                        default: `this.reverse(prop=[[/prop/${entryIsA}]])`,
                    }},
                    // Create entry A:
                    {code: "CreateEntry", data: {id: A, name: "Entry A", type: entryType, friendlyId: "a", description: ""}},
                    // Create entry B and its properties:
                    {code: "CreateEntry", data: {id: B, name: "Entry B", type: entryType, friendlyId: "b", description: ""}},
                    {code: "AddPropertyValue", data: {entry: B, property: entryIsA, valueExpression: `[[/entry/${A}]]`, note: "B is an A", propertyFactId: pfBisA}},
                ]}));

                assertEquals(await graph.read(tx => getEntryProperties(A, {tx})), [
                    {
                        property: {
                            id: propHasTypes,
                            importance: 1,
                            name: "Has types",
                            default: `this.reverse(prop=[[/prop/${entryIsA}]])`,
                        },
                        facts: [],
                    }
                ]);
            });
        });

        group("inheritance", () => {
            test("Returns inherited properties from parent entries, if the property is marked as inheritable", async () => {
                await resetDBToBlankSnapshot();
                // Create a site with:
                //   Entry A has prop1 = A1, prop2 = A2, prop3 = A3
                //   Entry B has             prop2 = B2
                //   Entry C has                         prop3 = C3
                //   C inherits from B which inherits from A
                //   Property 3 is not inheritable, but the others are.
                const pfA1 = VNID(), pfA2 = VNID(), pfA3 = VNID(), pfB2 = VNID(), pfC3 = VNID();
                const {id: siteId} = await graph.runAsSystem(CreateSite({name: "Test Site", domain: "test-site.neolace.net", slugId: "site-test"}));
                await graph.runAsSystem(ApplyEdits({siteId, edits: [
                    {code: "CreateEntryType", data: {id: entryType, name: "EntryType"}},
                    {code: "CreateProperty", data: {
                        id: entryIsA, name: "Type of", type: PropertyType.RelIsA, appliesTo: [{entryType}], descriptionMD: "", importance: 1,
                    }},
                    {code: "CreateProperty", data: {
                        id: prop1, name: "Property 1", type: PropertyType.Value, appliesTo: [{entryType}], descriptionMD: "",
                        inheritable: true,
                    }},
                    {code: "CreateProperty", data: {
                        id: prop2, name: "Property 2", type: PropertyType.Value, appliesTo: [{entryType}], descriptionMD: "",
                        inheritable: true,
                    }},
                    {code: "CreateProperty", data: {
                        id: prop3, name: "Property 3", type: PropertyType.Value, appliesTo: [{entryType}], descriptionMD: "",
                        inheritable: false,
                    }},
                    // Create entry A and its properties:
                    {code: "CreateEntry", data: {id: A, name: "Entry A", type: entryType, friendlyId: "a", description: ""}},
                    {code: "AddPropertyValue", data: {entry: A, property: prop1, valueExpression: `"A1"`, note: "", propertyFactId: pfA1}},
                    {code: "AddPropertyValue", data: {entry: A, property: prop2, valueExpression: `"A2"`, note: "", propertyFactId: pfA2}},
                    {code: "AddPropertyValue", data: {entry: A, property: prop3, valueExpression: `"A3"`, note: "", propertyFactId: pfA3}},
                    // Create entry B and its properties:
                    {code: "CreateEntry", data: {id: B, name: "Entry B", type: entryType, friendlyId: "b", description: ""}},
                    {code: "AddPropertyValue", data: {entry: B, property: entryIsA, valueExpression: `[[/entry/${A}]]`, note: "B is an A", propertyFactId: pfBisA}},
                    {code: "AddPropertyValue", data: {entry: B, property: prop2, valueExpression: `"B2"`, note: "", propertyFactId: pfB2}},
                    // Create entry C and its properties:
                    {code: "CreateEntry", data: {id: C, name: "Entry C", type: entryType, friendlyId: "c", description: ""}},
                    {code: "AddPropertyValue", data: {entry: C, property: entryIsA, valueExpression: `[[/entry/${B}]]`, note: "C is a B", propertyFactId: pfCisB}},
                    {code: "AddPropertyValue", data: {entry: C, property: prop3, valueExpression: `"C3"`, note: "", propertyFactId: pfC3}},
                ]}));

                // Define the expected property values:
                const expectedPropValue = (propId: VNID, factId: VNID, value: string, source: unknown = {from: "ThisEntry"}) => {
                    return {
                        property: {
                            id: propId,
                            importance: 15,
                            name: `Property ${
                                propId === prop1 ? "1" :
                                propId === prop2 ? "2" :
                                propId === prop3 ? "3" :
                                "X"
                            }`,
                            default: null,
                        },
                        facts: [{
                            factId,
                            note: "",
                            source,
                            rank: 1,
                            valueExpression: `"${value}"`,
                        }],
                    };
                };
    
                // Get the properties of A
                assertEquals(await graph.read(tx => getEntryProperties(A, {tx})), [
                    expectedPropValue(prop1, pfA1, "A1"),
                    expectedPropValue(prop2, pfA2, "A2"),
                    expectedPropValue(prop3, pfA3, "A3"),
                ]);
    
                // Get the properties of B
                assertEquals(await graph.read(tx => getEntryProperties(B, {tx})), [
                    // B is an A
                    {
                        property: {id: entryIsA, importance: 1, name: "Type of", default: null},
                        facts: [{factId: pfBisA, note: "B is an A", valueExpression: `[[/entry/${A}]]`, source: {from: "ThisEntry"}, rank: 1}],
                    },
                    // value A1 is inherited from Entry A, this entry's parent:
                    expectedPropValue(prop1, pfA1, "A1", {from: "AncestorEntry", entryId: A}),
                    // value B2 is set directly on this Entry B, and so A2 will not be inherited
                    expectedPropValue(prop2, pfB2, "B2"),
                    // A3 is NOT inherited because we marked property 3 as non-inheritable.
                ]);
    
                // Get the properties of C
                assertEquals(await graph.read(tx => getEntryProperties(C, {tx})), [
                    // C is a B
                    {
                        property: {id: entryIsA, importance: 1, name: "Type of", default: null},
                        facts: [{factId: pfCisB, note: "C is a B", valueExpression: `[[/entry/${B}]]`, source: {from: "ThisEntry"}, rank: 1}],
                    },
                    // value A1 is inherited from Entry A, this entry's grandparent:
                    expectedPropValue(prop1, pfA1, "A1", {from: "AncestorEntry", entryId: A}),
                    expectedPropValue(prop2, pfB2, "B2", {from: "AncestorEntry", entryId: B}),
                    expectedPropValue(prop3, pfC3, "C3"),
                ]);
            });
        });

        group("multiple property values", () => {
            test("test multiple values for a single property", async () => {
                await resetDBToBlankSnapshot();
                // Create a site with:
                //   Entry A has one property with one value
                //   Entry B inherits from A and has the same property with *TWO VALUES*
                //   Entry C inherits from B and has no direct properties.
                const factIdB1v1 = VNID(), factIdB1v2 = VNID();
                const {id: siteId} = await graph.runAsSystem(CreateSite({name: "Test Site", domain: "test-site.neolace.net", slugId: "site-test"}));
                await graph.runAsSystem(ApplyEdits({siteId, edits: [
                    {code: "CreateEntryType", data: {id: entryType, name: "EntryType"}},
                    {code: "CreateProperty", data: {
                        id: entryIsA, name: "Type of", type: PropertyType.RelIsA, appliesTo: [{entryType}], descriptionMD: "", importance: 1,
                    }},
                    {code: "CreateProperty", data: {id: prop1, name: "Property 1", type: PropertyType.Value, appliesTo: [{entryType}], descriptionMD: "", inheritable: true}},
                    // Create A
                    {code: "CreateEntry", data: {id: A, name: "Entry A", type: entryType, friendlyId: "a", description: ""}},
                    {code: "AddPropertyValue", data: {entry: A, property: prop1, propertyFactId: factIdA1, valueExpression: `"value for A prop1"`, note: ""}},
                    // Create B
                    {code: "CreateEntry", data: {id: B, name: "Entry B", type: entryType, friendlyId: "b", description: ""}},
                    // B inherits from A
                    {code: "AddPropertyValue", data: {entry: B, property: entryIsA, propertyFactId: pfBisA, valueExpression: `[[/entry/${A}]]`, note: ""}},
                    {code: "AddPropertyValue", data: {entry: B, property: prop1, propertyFactId: factIdB1v1, valueExpression: `"value 1 for B prop1"`, note: "first"}},
                    {code: "AddPropertyValue", data: {entry: B, property: prop1, propertyFactId: factIdB1v2, valueExpression: `"value 2 for B prop1"`, note: "second"}},
                    // Create C
                    {code: "CreateEntry", data: {id: C, name: "Entry C", type: entryType, friendlyId: "c", description: ""}},
                    // C inherits from B
                    {code: "AddPropertyValue", data: {entry: C, property: entryIsA, propertyFactId: pfCisB, valueExpression: `[[/entry/${B}]]`, note: ""}},
                ]}));
                // Check properties of B:
                assertEquals(
                    await graph.read(tx => getEntryProperty({entryId: B, propertyId: prop1, tx})),
                    {
                        property: {
                            id: prop1,
                            name: "Property 1",
                            importance: 15,
                            default: null,
                        },
                        facts: [
                            {factId: factIdB1v1, valueExpression: `"value 1 for B prop1"`, note: "first", source: {from: "ThisEntry"}, rank: 1},
                            {factId: factIdB1v2, valueExpression: `"value 2 for B prop1"`, note: "second", source: {from: "ThisEntry"}, rank: 2},
                        ],
                    },
                );
                // Check properties of C (inherited):
                assertEquals(
                    await graph.read(tx => getEntryProperty({entryId: C, propertyId: prop1, tx})),
                    {
                        property: {
                            id: prop1,
                            name: "Property 1",
                            importance: 15,
                            default: null,
                        },
                        facts: [
                            // Note that "rank" will be set automatically:
                            {rank: 1, factId: factIdB1v1, valueExpression: `"value 1 for B prop1"`, note: "first", source: {from: "AncestorEntry", entryId: B}},
                            {rank: 2, factId: factIdB1v2, valueExpression: `"value 2 for B prop1"`, note: "second", source: {from: "AncestorEntry", entryId: B}},
                        ],
                    },
                );
            });

            test("property rank can be used to explicitly order properties", async () => {
                await resetDBToBlankSnapshot();
                // Create a site with:
                //   Entry A has one property with three values in a specific order
                const factIdA1v1 = VNID(), factIdA1v2 = VNID(), factIdA1v3 = VNID();
                const {id: siteId} = await graph.runAsSystem(CreateSite({name: "Test Site", domain: "test-site.neolace.net", slugId: "site-test"}));
                await graph.runAsSystem(ApplyEdits({siteId, edits: [
                    {code: "CreateEntryType", data: {id: entryType, name: "EntryType"}},
                    {code: "CreateProperty", data: {id: prop1, name: "Property 1", type: PropertyType.Value, appliesTo: [{entryType}], descriptionMD: "", inheritable: true}},
                    // Create A
                    {code: "CreateEntry", data: {id: A, name: "Entry A", type: entryType, friendlyId: "a", description: ""}},
                    {code: "AddPropertyValue", data: {
                        entry: A, property: prop1, propertyFactId: factIdA1v2,
                        valueExpression: `"value 2 for A prop1"`, note: "second but added first", rank: 2,
                    }},
                    {code: "AddPropertyValue", data: {
                        entry: A, property: prop1, propertyFactId: factIdA1v3,
                        valueExpression: `"value 3 for A prop1"`, note: "third but added second", rank: 3,
                    }},
                    {code: "AddPropertyValue", data: {
                        entry: A, property: prop1, propertyFactId: factIdA1v1,
                        valueExpression: `"value 1 for A prop1"`, note: "first but added third", rank: 1,
                    }},
                ]}));
                // Check properties of A:
                assertEquals(
                    await graph.read(tx => getEntryProperty({entryId: A, propertyId: prop1, tx})),
                    {
                        property: {id: prop1, name: "Property 1", importance: 15, default: null},
                        facts: [
                            {factId: factIdA1v1, valueExpression: `"value 1 for A prop1"`, note: "first but added third", rank: 1, source: {from: "ThisEntry"}},
                            {factId: factIdA1v2, valueExpression: `"value 2 for A prop1"`, note: "second but added first", rank: 2, source: {from: "ThisEntry"}},
                            {factId: factIdA1v3, valueExpression: `"value 3 for A prop1"`, note: "third but added second", rank: 3, source: {from: "ThisEntry"}},
                        ],
                    },
                );
            });
        });

        group("slots", () => {
            const siteId = VNID();
            const componentType = VNID();
            const entryHasPart = VNID();
            const steeringWheel = VNID(), combustionEngine = VNID(), electricMotor = VNID(), car = VNID(), electricCar = VNID();
            const pfCarHasWheel = VNID(), pfCarhasEngine = VNID(), pfElectricCarIsCar = VNID(), pfElectricCarHasMotor = VNID();
            beforeAll(async () => {
                await resetDBToBlankSnapshot();
                // Create a site with:
                //   Entries "Steering Wheel", "Combustion Engine", "Electric Motor"
                //   Entry "Car" has part "Steering Wheel" in slot "sw", "Combustion Engine" in slot "motor"
                //   Entry "Electric Car" inherits from "Car" and has part "Electic Motor" in slot "motor"
                await graph.runAsSystem(CreateSite({id: siteId, name: "Test Site", domain: "test-site.neolace.net", slugId: "site-test"}));
                await graph.runAsSystem(ApplyEdits({siteId, edits: [
                    {code: "CreateEntryType", data: {id: entryType, name: "Vehicle"}},
                    {code: "CreateEntryType", data: {id: componentType, name: "Component"}},
                    // Create relationship properties:
                    {code: "CreateProperty", data: {
                        id: entryIsA, name: "Type of", type: PropertyType.RelIsA, appliesTo: [{entryType}], descriptionMD: "", importance: 1,
                    }},
                    {code: "CreateProperty", data: {
                        id: entryHasPart, name: "Has Part", type: PropertyType.RelOther, appliesTo: [{entryType}], descriptionMD: "", importance: 2,
                        inheritable: true,
                        enableSlots: true,
                    }},
                    // Create "component" entries:
                    {code: "CreateEntry", data: {id: steeringWheel, name: "Steering Wheel", type: componentType, friendlyId: "c-sw", description: ""}},
                    {code: "CreateEntry", data: {id: combustionEngine, name: "Combustion Engine", type: componentType, friendlyId: "c-ce", description: ""}},
                    {code: "CreateEntry", data: {id: electricMotor, name: "Electric Motor", type: componentType, friendlyId: "c-em", description: ""}},
                    // Create entry "Car": has part "Steering Wheel" in slot "sw", "Combustion Engine" in slot "motor"
                    {code: "CreateEntry", data: {id: car, name: "Car", type: entryType, friendlyId: "v-car", description: ""}},
                    {code: "AddPropertyValue", data: {entry: car, property: entryHasPart, slot: "sw", valueExpression: `[[/entry/${steeringWheel}]]`, note: "wheel", propertyFactId: pfCarHasWheel}},
                    {code: "AddPropertyValue", data: {entry: car, property: entryHasPart, slot: "motor", valueExpression: `[[/entry/${combustionEngine}]]`, note: "engine", propertyFactId: pfCarhasEngine}},
                    // Create entry "Electric Car": has part "Electric Motor" in slot "motor"
                    {code: "CreateEntry", data: {id: electricCar, name: "Electric Car", type: entryType, friendlyId: "v-e-car", description: ""}},
                    {code: "AddPropertyValue", data: {entry: electricCar, property: entryIsA, valueExpression: `[[/entry/${car}]]`, note: "wheel", propertyFactId: pfElectricCarIsCar}},
                    {code: "AddPropertyValue", data: {entry: electricCar, property: entryHasPart, slot: "motor", valueExpression: `[[/entry/${electricMotor}]]`, note: "motor", propertyFactId: pfElectricCarHasMotor}},
                ]}));
            });
            test("'slots' allow partial inheritance where _some_ inherited values get overwritten, others don't.", async () => {
                // Car is normal, has two parts:
                assertEquals(
                    await graph.read(tx => getEntryProperty({entryId: car, propertyId: entryHasPart, tx})),
                    {
                        property: {id: entryHasPart, name: "Has Part", importance: 2, default: null},
                        facts: [
                            // These are sorted in alphabetical order by slot so "motor" comes before "sw" (steering wheel)
                            {factId: pfCarhasEngine, valueExpression: `[[/entry/${combustionEngine}]]`, note: "engine", slot: "motor", rank: 2, source: {from: "ThisEntry"}},
                            {factId: pfCarHasWheel, valueExpression: `[[/entry/${steeringWheel}]]`, note: "wheel", slot: "sw", rank: 1, source: {from: "ThisEntry"}},
                        ],
                    },
                );

                // Now with slots enabled, electric car should have "steering wheel" (inherited), and "Electric Motor" but not "Combustion Engine"
                // Slots allow partial inheritance of "steering wheel", while "combustion engine" gets overwritten
                assertEquals(
                    await graph.read(tx => getEntryProperty({entryId: electricCar, propertyId: entryHasPart, tx})),
                    {
                        property: {id: entryHasPart, name: "Has Part", importance: 2, default: null},
                        facts: [
                            {factId: pfElectricCarHasMotor, valueExpression: `[[/entry/${electricMotor}]]`, note: "motor", slot: "motor", rank: 1, source: {from: "ThisEntry"}},
                            {factId: pfCarHasWheel, valueExpression: `[[/entry/${steeringWheel}]]`, note: "wheel", slot: "sw", rank: 1, source: {from: "AncestorEntry", entryId: car}},
                        ],
                    },
                );
            });
            test("slots can be disabled, even after slot values were set", async () => {
                await graph.runAsSystem(ApplyEdits({siteId, edits: [
                    {code: "UpdateProperty", data: {
                        id: entryHasPart,
                        enableSlots: false,
                    }},
                ]}));
                // Now with slots disabled, electric car won't inherit steering wheel, because having any value for
                // "has parts" will override ALL inherited values.
                assertEquals(
                    await graph.read(tx => getEntryProperty({entryId: electricCar, propertyId: entryHasPart, tx})),
                    {
                        property: {id: entryHasPart, name: "Has Part", importance: 2, default: null},
                        facts: [
                            // However, slot values are still returned, since they are set:
                            {factId: pfElectricCarHasMotor, valueExpression: `[[/entry/${electricMotor}]]`, note: "motor", slot: "motor", rank: 1, source: {from: "ThisEntry"}},
                        ],
                    },
                );
            });
        });

        test("Can paginate, filter, and provide total count of properties", async () => {
            await resetDBToBlankSnapshot();
            // Create a site with:
            //   Entry A has 10 properties [and 5 non-editable Auto values that all entries of that type have]
            //   Entry B has 30 properties [and 5 non-editable Auto values that all entries of that type have]
            //   B inherits 8 properties from A, but overwrites 2 of them so only 6 are inherited
            //   B also has 1 "is a" property to define its relationship to A
            //
            //   So: A has 15 properties total (10 + 5)
            //       B has 42 properties total (30 + 5 + 6 + 1)
            const {id: siteId} = await graph.runAsSystem(CreateSite({name: "Test Site", domain: "test-site.neolace.net", slugId: "site-test"}));
            await graph.runAsSystem(ApplyEdits({siteId, edits: [
                {code: "CreateEntryType", data: {id: entryType, name: "EntryType"}},
                {code: "CreateProperty", data: {
                    id: entryIsA, name: "Is a", type: PropertyType.RelIsA, appliesTo: [{entryType}], descriptionMD: "", importance: 99,
                }},
                // Create entry A and B:
                {code: "CreateEntry", data: {id: A, name: "Entry A", type: entryType, friendlyId: "a", description: ""}},
                {code: "CreateEntry", data: {id: B, name: "Entry B", type: entryType, friendlyId: "b", description: ""}},
                // B inherits from A:
                {code: "AddPropertyValue", data: {entry: B, property: entryIsA, propertyFactId: pfBisA, valueExpression: `[[/entry/${A}]]`, note: ""}},
            ]}));

            const edits: EditList = [];

            // Create 5 non-editable Auto values that all entries of that type have:
            const autoPropertyValues: EntryPropertyValueSet[] = [];
            for (let i = 0; i < 5; i++) {
                const id = VNID();
                const args = {
                    id,
                    name: `Auto Property ${i}`,
                    importance: i,
                    default: `"AutoProp${i} value"`,
                };
                edits.push({
                    code: "CreateProperty", data: {appliesTo: [{entryType}], descriptionMD: "",
                    mode: PropertyMode.Auto,
                    ...args,
                }});
                autoPropertyValues.push({
                    property: {...args},
                    facts: [],
                });
            }

            // Create 10 property values on entry A, the first 8 of which are inheritable
            const aPropertyValues: EntryPropertyValueSet[] = [];
            for (let i = 0; i < 10; i++) {
                const id = VNID();
                const propArgs = {
                    id,
                    name: `Property ${i}`,
                    importance: i,
                };
                edits.push({
                    code: "CreateProperty", data: {...propArgs, appliesTo: [{entryType}], descriptionMD: "",
                    inheritable: i < 8,
                }});
                const factId = VNID();
                edits.push({code: "AddPropertyValue", data: {entry: A, property: id, propertyFactId: factId, valueExpression: `"A${i}"`, note: ""}});
                aPropertyValues.push({
                    property: {...propArgs, default: null},
                    facts: [{
                        factId,
                        valueExpression: `"A${i}"`,
                        note: "",
                        rank: 1,
                        source: {from: "ThisEntry"},
                    }],
                });
            }

            // B will inherit eight properties (0..7) from A, but will overwrite two of them:
            const factIdB6 = VNID();
            edits.push({code: "AddPropertyValue", data: {entry: B, property: aPropertyValues[6].property.id, propertyFactId: factIdB6, valueExpression: `"B6"`, note: ""}});
            const factIdB7 = VNID();
            edits.push({code: "AddPropertyValue", data: {entry: B, property: aPropertyValues[7].property.id, propertyFactId: factIdB7, valueExpression: `"B7"`, note: ""}});
            // In addition to those two overwritten properties, B has 28 other properties set:
            const bPropertyValues = [];
            for (let i = 0; i < 28; i++) {
                const id = VNID();
                const propArgs = {
                    id,
                    name: `B Property ${i}`,
                    importance: 20 + i,
                };
                edits.push({
                    code: "CreateProperty", data: {...propArgs, appliesTo: [{entryType}], descriptionMD: "",
                }});
                const factId = VNID();
                edits.push({code: "AddPropertyValue", data: {entry: B, property: id, propertyFactId: factId, valueExpression: `"B${i}"`, note: ""}});
                bPropertyValues.push({
                    property: {...propArgs, default: null},
                    facts: [{
                        factId,
                        valueExpression: `"B${i}"`,
                        note: "",
                        rank: 1,
                        source: {from: "ThisEntry"},
                    }],
                });
            }

            await graph.runAsSystem(ApplyEdits({siteId, edits}));

            // Get the properties of A with importance <= 2:
            assertEquals(await graph.read(tx => getEntryProperties(A, {tx, maxImportance: 2})), [
                // Results are sorted by importance, and by label.
                autoPropertyValues[0],
                aPropertyValues[0],
                autoPropertyValues[1],
                aPropertyValues[1],
                autoPropertyValues[2],
                aPropertyValues[2],
            ]);

            // Now get same as above but SKIP the first two and LIMIT to 3 results, and include the total count.
            {
                const result = await graph.read(tx => getEntryProperties(A, {tx, skip: 2, limit: 3, totalCount: true, maxImportance: 2}));
                assertEquals(result.slice(), [  // Use slice to discard the totalCount info which otherwise counts as a difference
                    autoPropertyValues[1],
                    aPropertyValues[1],
                    autoPropertyValues[2],
                ]);
                assertEquals(result.totalCount, 6);
            }

            // Helper to generate the expected results for B based on the ones from A:
            const updateExpectedFact = (input: {facts: {source: unknown}[]}, updates: Record<string, unknown>) => {
                const newData = {...input};
                newData.facts[0] = {...input.facts[0], ...updates};
                return input;
            }

            // Get the first ten properties of B, and the total count
            {
                const result = await graph.read(tx => getEntryProperties(B, {tx, limit: 16, totalCount: true}));
                assertEquals(result.slice(), [  // Use slice to discard the totalCount info which otherwise counts as a difference
                    // B inherits 8 properties from A, but overwrites 2 of them so only 6 are inherited,
                    // but also has autoPropertyValues interleaved
                    autoPropertyValues[0],
                    updateExpectedFact(aPropertyValues[0], {source: {from: "AncestorEntry", entryId: A}}),
                    autoPropertyValues[1],
                    updateExpectedFact(aPropertyValues[1], {source: {from: "AncestorEntry", entryId: A}}),
                    autoPropertyValues[2],
                    updateExpectedFact(aPropertyValues[2], {source: {from: "AncestorEntry", entryId: A}}),
                    autoPropertyValues[3],
                    updateExpectedFact(aPropertyValues[3], {source: {from: "AncestorEntry", entryId: A}}),
                    autoPropertyValues[4],
                    updateExpectedFact(aPropertyValues[4], {source: {from: "AncestorEntry", entryId: A}}),
                    updateExpectedFact(aPropertyValues[5], {source: {from: "AncestorEntry", entryId: A}}),
                    updateExpectedFact(aPropertyValues[6], {factId: factIdB6, valueExpression: `"B6"`, source: {from: "ThisEntry"}}),  // B overrides inherited property 6
                    updateExpectedFact(aPropertyValues[7], {factId: factIdB7, valueExpression: `"B7"`, source: {from: "ThisEntry"}}),  // B overrides inherited property 7
                    bPropertyValues[0],
                    bPropertyValues[1],
                    bPropertyValues[2],
                ]);
                // Check that the total count matches the actual results if we fetch them all
                assertEquals((await graph.read(tx => getEntryProperties(B, {tx}))).length, result.totalCount);
                assertEquals(result.totalCount, 42);
            }
        });

        // TODO: test the dbHits performance of getProperties()
    });
});
