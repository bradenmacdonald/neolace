import { C, Field, VNID } from "neolace/deps/vertex-framework.ts";
import { PropertyType, PropertyMode } from "neolace/deps/neolace-api.ts";

import { group, test, resetDBToBlankSnapshot, assertEquals, beforeAll } from "neolace/lib/tests.ts";
import { graph } from "neolace/core/graph.ts";
import { CreateSite } from "neolace/core/Site.ts";
import { ApplyEdits } from "neolace/core/edit/ApplyEdits.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { Property } from "neolace/core/schema/Property.ts";
import { PropertyFact } from "neolace/core/entry/PropertyFact.ts";
import { getEntryProperties, getEntryProperty } from "neolace/core/entry/properties.ts";

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
        const factIdB1 = VNID();

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

        // TODO: test slots

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
                        default: `this.reverseProp(prop=[[/prop/${entryIsA}]])`,
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
                            default: `this.reverseProp(prop=[[/prop/${entryIsA}]])`,
                        },
                        facts: [],
                    }
                ]);
            });
        });

        // TODO: test multiple property values

        group("inheritance", () => {
            test("Returns inherited properties from parent entries, if the property is marked as inheritable", async () => {
                await resetDBToBlankSnapshot();
                // Create a site with:
                //   Entry A has prop1 = A1, prop2 = A2, prop3 = A3
                //   Entry B has             prop2 = B2
                //   Entry C has                         prop3 = C3
                //   C inherits from B which inherits from A
                //   Property 3 is not inheritable, but the others are.
                const pfA1 = VNID(), pfA2 = VNID(), pfA3 = VNID();
                const pfBisA = VNID(), pfB2 = VNID();
                const pfCisB = VNID(), pfC3 = VNID();
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
                        facts: [{factId: pfBisA, note: "B is an A", valueExpression: `[[/entry/${A}]]`, source: {from: "ThisEntry"}}],
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
                        facts: [{factId: pfCisB, note: "C is a B", valueExpression: `[[/entry/${B}]]`, source: {from: "ThisEntry"}}],
                    },
                    // value A1 is inherited from Entry A, this entry's grandparent:
                    expectedPropValue(prop1, pfA1, "A1", {from: "AncestorEntry", entryId: A}),
                    expectedPropValue(prop2, pfB2, "B2", {from: "AncestorEntry", entryId: B}),
                    expectedPropValue(prop3, pfC3, "C3"),
                ]);
            });
        });

        /*
            test("getPropery() gives the same result for each property as getEntryProperties()", async () => {
                for (const entryId of [A, B, C]) {
                    const allProps = await graph.read(tx => getEntryProperties(entryId, {tx}));
                    for (const propData of allProps) {
                        // get the property by ID:
                        assertEquals(
                            await graph.read(tx => getEntryProperty(entryId, {propertyId: propData.id, tx})),
                            propData,
                        );
                    }
                }
            });
        });

        test("Can paginate, filter, and provide total count of properties", async () => {
            await resetDBToBlankSnapshot();
            // Create a site with:
            //   Entry A has 10 properties [and 5 simple property values on its type]
            //   Entry B has 30 properties [and 5 simple property values on its type]
            //   B inherits 8 properties from A, but overwrites 2 of them so only 6 are inherited
            //
            //   So: A has 15 properties total (10 + 5)
            //       B has 41 properties total (30 + 5 + 6)
            const {id: siteId} = await graph.runAsSystem(CreateSite({name: "Test Site", domain: "test-site.neolace.net", slugId: "site-test"}));
            await graph.runAsSystem(ApplyEdits({siteId, edits: [
                {code: "CreateEntryType", data: {id: entryType, name: "EntryType"}},
                {code: "CreateEntryType", data: {id: propertyType, name: "PropertyType"}},
                {code: "UpdateEntryTypeFeature", data: {entryTypeId: propertyType, feature: {
                    featureType: "UseAsProperty",
                    enabled: true,
                    config: {appliesToEntryTypes: [entryType]},
                }}},
                {code: "CreateRelationshipType", data: {id: entryIsA, category: RelationshipCategory.IS_A, nameForward: "is a", nameReverse: "has types"}},
                {code: "UpdateRelationshipType", data: {id: entryIsA, addFromTypes: [entryType], addToTypes: [entryType]}},
                // Create entry A and B:
                {code: "CreateEntry", data: {id: A, name: "Entry A", type: entryType, friendlyId: "a", description: ""}},
                {code: "CreateEntry", data: {id: B, name: "Entry B", type: entryType, friendlyId: "b", description: ""}},
                {code: "CreateRelationshipFact", data: {fromEntry: B, type: entryIsA, toEntry: A, id: VNID()}},  // B is a A
            ]}));

            const edits: EditList = [];

            // Create 5 SimplePropertyValues on the entry type:
            const simplePropertyValues = [];
            for (let i = 0; i < 5; i++) {
                const id = VNID();
                const args = {
                    id,
                    importance: i,
                    note: `N${i}`,
                    valueExpression: `"SPV${i} value"`,
                    label: `SPV${i} Label`
                };
                edits.push({code: "UpdateEntryType", data: {id: entryType, addOrUpdateSimpleProperties: [args]}});
                simplePropertyValues.push({
                    ...args,
                    type: "SimplePropertyValue",
                    source: {from: "EntryType"},
                });
            }


            // Create 10 normal property values on entry A, the first 8 of which are inheritable
            const aPropertyValues = [];
            for (let i = 0; i < 10; i++) {
                const id = VNID();
                edits.push({code: "CreateEntry", data: {id, name: `Property ${i}`, type: propertyType, friendlyId: `p${i}`, description: ""}});
                edits.push({code: "UpdateEntryFeature", data: {entryId: id, feature: { featureType: "UseAsProperty",
                    importance: i,
                    inherits: i < 8,
                }}});
                edits.push({code: "UpdatePropertyValue", data: {entry: A, property: id, valueExpression: `"A${i}"`, note: ""}});
                aPropertyValues.push({
                    label: `Property ${i}`,
                    valueExpression: `"A${i}"`,
                    importance: i,
                    id,
                    note: "",
                    type: "PropertyValue",
                    source: {from: "ThisEntry"},
                    displayAs: null,
                });
            }

            // B will inherit eight properties (0..7) from A, but will overwrite two of them:
            edits.push({code: "UpdatePropertyValue", data: {entry: B, property: aPropertyValues[6].id, valueExpression: `"B6"`, note: ""}});
            edits.push({code: "UpdatePropertyValue", data: {entry: B, property: aPropertyValues[7].id, valueExpression: `"B7"`, note: ""}});
            // In addition to those two overwritten properties, B has 28 other properties set:
            const bPropertyValues = [];
            for (let i = 0; i < 28; i++) {
                const id = VNID();
                edits.push({code: "CreateEntry", data: {id, name: `B Property ${i}`, type: propertyType, friendlyId: `p-b${i}`, description: ""}});
                edits.push({code: "UpdateEntryFeature", data: {entryId: id, feature: { featureType: "UseAsProperty",
                    importance: 20 + i,
                }}});
                edits.push({code: "UpdatePropertyValue", data: {entry: B, property: id, valueExpression: `"B${i}"`, note: ""}});
                bPropertyValues.push({
                    label: `B Property ${i}`,
                    valueExpression: `"B${i}"`,
                    importance: 20 + i,
                    id,
                    note: "",
                    type: "PropertyValue",
                    source: {from: "ThisEntry"},
                    displayAs: null,
                });
            }

            await graph.runAsSystem(ApplyEdits({siteId, edits}));

            // Get the properties of A with importance <= 2:
            assertEquals(await graph.read(tx => getEntryProperties(A, {tx, maxImportance: 2})), [
                // Results are sorted by importance, and by label.
                aPropertyValues[0],
                simplePropertyValues[0],
                aPropertyValues[1],
                simplePropertyValues[1],
                aPropertyValues[2],
                simplePropertyValues[2],
            ]);

            // Now get same as above but SKIP the first two and LIMIT to 3 results, and include the total count.
            {
                const result = await graph.read(tx => getEntryProperties(A, {tx, skip: 2, limit: 3, totalCount: true, maxImportance: 2}));
                assertEquals(result.slice(), [  // Use slice to discard the totalCount info which otherwise counts as a difference
                    aPropertyValues[1],
                    simplePropertyValues[1],
                    aPropertyValues[2],
                ]);
                assertEquals(result.totalCount, 6);
            }


            // Get the first ten properties of B, and the total count
            {
                const result = await graph.read(tx => getEntryProperties(B, {tx, limit: 16, totalCount: true}));
                assertEquals(result.slice(), [  // Use slice to discard the totalCount info which otherwise counts as a difference
                    // B inherits 8 properties from A, but overwrites 2 of them so only 6 are inherited,
                    // but also has SimplePropertyValues interleaved
                    {...aPropertyValues[0], source: {from: "AncestorEntry", entryId: A}},
                    simplePropertyValues[0],
                    {...aPropertyValues[1], source: {from: "AncestorEntry", entryId: A}},
                    simplePropertyValues[1],
                    {...aPropertyValues[2], source: {from: "AncestorEntry", entryId: A}},
                    simplePropertyValues[2],
                    {...aPropertyValues[3], source: {from: "AncestorEntry", entryId: A}},
                    simplePropertyValues[3],
                    {...aPropertyValues[4], source: {from: "AncestorEntry", entryId: A}},
                    simplePropertyValues[4],
                    {...aPropertyValues[5], source: {from: "AncestorEntry", entryId: A}},
                    {...aPropertyValues[6], valueExpression: `"B6"`, source: {from: "ThisEntry"}},  // B overrides inherited property 6
                    {...aPropertyValues[7], valueExpression: `"B7"`, source: {from: "ThisEntry"}},  // B overrides inherited property 7
                    bPropertyValues[0],
                    bPropertyValues[1],
                    bPropertyValues[2],
                ]);
                // Check that the total count matches the actual results if we fetch them all
                assertEquals((await graph.read(tx => getEntryProperties(B, {tx}))).length, result.totalCount);
                assertEquals(result.totalCount, 41);
            }
        });

        // TODO: test the dbHits performance of getProperties()

    */
    });
});
