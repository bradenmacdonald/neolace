import { C, Field, VNID } from "neolace/deps/vertex-framework.ts";
// import { EditList } from "neolace/deps/neolace-api.ts";

import { group, test, resetDBToBlankSnapshot, assertEquals, beforeAll } from "neolace/lib/tests.ts";
import { graph } from "neolace/core/graph.ts";
import { CreateSite } from "neolace/core/Site.ts";
import { ApplyEdits } from "neolace/core/edit/ApplyEdits.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { Property } from "neolace/core/schema/Property.ts";
import { PropertyFact } from "neolace/core/entry/PropertyFact.ts";
// import { getEntryProperties, getEntryProperty } from "neolace/core/entry/pro perties.ts";

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

        test("Define a new property and set it on an entry", async () => {
            const entryId = VNID();
            const propertyId = VNID();
            await graph.runAsSystem(ApplyEdits({siteId, edits: [
                {code: "CreateEntry", data: {id: entryId, name: "Entry", type: entryType, description: "Testing", friendlyId: "te1"}},
                {code: "CreateProperty", data: {id: propertyId, name: "Property", appliesTo: [{entryType}]}},
            ]}));
            await graph.runAsSystem(ApplyEdits({siteId, edits: [
                {code: "UpdatePropertyValue", data: {
                    entry: entryId,
                    property: propertyId,
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
    });

    /*
    group("getProperties", () => {
        // Entry Type IDs:
        const entryType = VNID(), propertyType = VNID();
        // Relationship Type IDs:
        const entryIsA = VNID();
        // Entry IDs:
        const A = VNID(), B = VNID(), C = VNID(), prop1 = VNID(), prop2 = VNID(), prop3 = VNID();
        // Simple Property Value IDs:
        const spv1 = VNID(), spv2 = VNID();

        group("blank entry and single property entry", () => {
            beforeAll(async () => {
                await resetDBToBlankSnapshot();
                // Create a site with:
                //   Entry A has no properties
                //   Entry B has one property
                const {id: siteId} = await graph.runAsSystem(CreateSite({name: "Test Site", domain: "test-site.neolace.net", slugId: "site-test"}));
                await graph.runAsSystem(ApplyEdits({siteId, edits: [
                    {code: "CreateEntryType", data: {id: entryType, name: "EntryType"}},
                    {code: "CreateEntryType", data: {id: propertyType, name: "PropertyType"}},
                    {code: "UpdateEntryTypeFeature", data: {entryTypeId: propertyType, feature: {
                        featureType: "UseAsProperty",
                        enabled: true,
                        config: {appliesToEntryTypes: [entryType]},
                    }}},
                    {code: "CreateEntry", data: {id: A, name: "Entry A", type: entryType, friendlyId: "a", description: ""}},
                    {code: "CreateEntry", data: {id: B, name: "Entry B", type: entryType, friendlyId: "b", description: ""}},
                    {code: "CreateEntry", data: {id: prop1, name: "Property 1", type: propertyType, friendlyId: "p1", description: ""}},
                    {code: "UpdatePropertyValue", data: {entry: B, property: prop1, valueExpression: `"value for B prop1"`, note: ""}},
                ]}));
            });

            test("Returns no properties for a blank entry", async () => {
                // Get the properties of A
                assertEquals(await graph.read(tx => getEntryProperties(A, {tx})), [
                    // No properties
                ]);
            });

            test("returns a basic property for an entry with a property", async () => {
                // Get the properties of B
                assertEquals(await graph.read(tx => getEntryProperties(B, {tx})), [
                    {
                        label: "Property 1",
                        valueExpression: '"value for B prop1"',
                        importance: 10,  // Default importance
                        id: prop1,
                        note: "",
                        type: "PropertyValue",
                        source: {from: "ThisEntry"},
                        displayAs: null,
                    },
                ]);
            });

            test("getPropery() by ID", async () => {
                const allProps = await graph.read(tx => getEntryProperties(B, {tx}));
                assertEquals(allProps.length, 1);
                const expected = allProps[0];
                assertEquals(
                    await graph.read(tx => getEntryProperty(B, {propertyId: expected.id, tx})),
                    expected,
                );
                // And if we give a random property ID, we should get no result:
                assertEquals(
                    await graph.read(tx => getEntryProperty(B, {propertyId: prop3, tx})),
                    undefined,
                );
            });

            test("getPropery() by label", async () => {
                const allProps = await graph.read(tx => getEntryProperties(B, {tx}));
                assertEquals(allProps.length, 1);
                const expected = allProps[0];
                assertEquals(
                    await graph.read(tx => getEntryProperty(B, {labelExact: expected.label, tx})),
                    expected,
                );
                // And if we give a random label string, we should get no result:
                assertEquals(
                    await graph.read(tx => getEntryProperty(B, {labelExact: "foobar", tx})),
                    undefined,
                );
            });
        });

        group("two entry types, one with simple prop values", () => {
            beforeAll(async () => {
                await resetDBToBlankSnapshot();
                // Create a site with:
                //   Entry A has an entry type with two simple property values
                //   Entry "Property 1" has an entry type with no simple property values
                const {id: siteId} = await graph.runAsSystem(CreateSite({name: "Test Site", domain: "test-site.neolace.net", slugId: "site-test"}));
                await graph.runAsSystem(ApplyEdits({siteId, edits: [
                    {code: "CreateEntryType", data: {id: entryType, name: "EntryType"}},
                    {code: "CreateEntryType", data: {id: propertyType, name: "PropertyType"}},
                    {code: "UpdateEntryType", data: {id: entryType, addOrUpdateSimpleProperties: [
                        {id: spv1, importance: 50, note: "Test note", valueExpression: `"spv1 value"`, label: "SPV 1 Label"},
                        {id: spv2, importance: 1, note: "Test note", valueExpression: `"spv2 value"`, label: "SPV 2 Label"},
                    ]}},
                    {code: "CreateEntry", data: {id: A, name: "Entry A", type: entryType, friendlyId: "a", description: ""}},
                    {code: "CreateEntry", data: {id: prop1, name: "Property 1", type: propertyType, friendlyId: "p1", description: ""}},
                ]}));
            });

            test("Returns SimplePropertyValues set on the entry type", async () => {
                // Get the properties of Property 1, which is an entry whose type has no SimplePropertyValues
                assertEquals(await graph.read(tx => getEntryProperties(prop1, {tx})), [
                    // No properties
                ]);
    
                // Get the properties of A, which has two simple property values and they should be returned in order of importance
                assertEquals(await graph.read(tx => getEntryProperties(A, {tx})), [
                    {
                        label: "SPV 2 Label",
                        valueExpression: '"spv2 value"',
                        importance: 1,  // Most important is lowest important value, so 1 is sorted before 50
                        id: spv2,
                        note: "Test note",
                        type: "SimplePropertyValue",
                        source: {from: "EntryType"},
                    },
                    {
                        label: "SPV 1 Label",
                        valueExpression: '"spv1 value"',
                        importance: 50,  // Less important than 1
                        id: spv1,
                        note: "Test note",
                        type: "SimplePropertyValue",
                        source: {from: "EntryType"},
                    },
                ]);
            });

            test("getPropery()", async () => {
                const allProps = await graph.read(tx => getEntryProperties(A, {tx}));
                assertEquals(allProps.length, 2);
                for (const propData of allProps) {
                    // get the property by ID:
                    assertEquals(
                        await graph.read(tx => getEntryProperty(A, {propertyId: propData.id, tx})),
                        propData,
                    );
                    // or by label:
                    assertEquals(
                        await graph.read(tx => getEntryProperty(A, {labelExact: propData.label, tx})),
                        propData,
                    );
                    // Trying to load the property from another entry gives no result:
                    assertEquals(
                        await graph.read(tx => getEntryProperty(prop1, {propertyId: propData.id, tx})),
                        undefined,
                    );
                }
            });
        });


        group("regular properties and inheritance", () => {
            beforeAll(async () => {
                await resetDBToBlankSnapshot();
                // Create a site with:
                //   Entry A has prop1 = A1, prop2 = A2, prop3 = A3
                //   Entry B has             prop2 = B2
                //   Entry C has                         prop3 = C3
                //   C inherits from B which inherits from A
                //   Property 3 is not inheritable, but the others are.
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
                    // Create properties:
                    {code: "CreateEntry", data: {id: prop1, name: "Property 1", type: propertyType, friendlyId: "p1", description: ""}},
                    {code: "UpdateEntryFeature", data: {entryId: prop1, feature: { featureType: "UseAsProperty",
                        inherits: true,
                    }}},
                    {code: "CreateEntry", data: {id: prop2, name: "Property 2", type: propertyType, friendlyId: "p2", description: ""}},
                    {code: "UpdateEntryFeature", data: {entryId: prop2, feature: { featureType: "UseAsProperty",
                        inherits: true,
                    }}},
                    {code: "CreateEntry", data: {id: prop3, name: "Property 3", type: propertyType, friendlyId: "p3", description: ""}},
                    {code: "UpdateEntryFeature", data: {entryId: prop3, feature: { featureType: "UseAsProperty",
                        inherits: false,
                    }}},
                    // Create entry A and its properties:
                    {code: "CreateEntry", data: {id: A, name: "Entry A", type: entryType, friendlyId: "a", description: ""}},
                    {code: "UpdatePropertyValue", data: {entry: A, property: prop1, valueExpression: `"A1"`, note: ""}},
                    {code: "UpdatePropertyValue", data: {entry: A, property: prop2, valueExpression: `"A2"`, note: ""}},
                    {code: "UpdatePropertyValue", data: {entry: A, property: prop3, valueExpression: `"A3"`, note: ""}},
                    // Create entry B and its properties:
                    {code: "CreateEntry", data: {id: B, name: "Entry B", type: entryType, friendlyId: "b", description: ""}},
                    {code: "CreateRelationshipFact", data: {fromEntry: B, type: entryIsA, toEntry: A, id: VNID()}},  // B is a A
                    {code: "UpdatePropertyValue", data: {entry: B, property: prop2, valueExpression: `"B2"`, note: ""}},
                    // Create entry C and its properties:
                    {code: "CreateEntry", data: {id: C, name: "Entry C", type: entryType, friendlyId: "c", description: ""}},
                    {code: "CreateRelationshipFact", data: {fromEntry: C, type: entryIsA, toEntry: B, id: VNID()}},  // C is a B
                    {code: "UpdatePropertyValue", data: {entry: C, property: prop3, valueExpression: `"C3"`, note: ""}},
                ]}));
            });

            test("Returns inherited properties from parent entries, if the property is marked as inheritable", async () => {
                // Define the expected property values:
                const A1 = {
                    label: "Property 1",
                    valueExpression: '"A1"',
                    importance: 10,  // Default importance
                    id: prop1,
                    note: "",
                    type: "PropertyValue",
                    source: {from: "ThisEntry"},
                    displayAs: null,
                };
                const A2 = {...A1, label: "Property 2", valueExpression: '"A2"', id: prop2};
                const A3 = {...A1, label: "Property 3", valueExpression: '"A3"', id: prop3};
                const B2 = {...A1, label: "Property 2", valueExpression: '"B2"', id: prop2};
                const C3 = {...A1, label: "Property 3", valueExpression: '"C3"', id: prop3};
    
                // Get the properties of A
                assertEquals(await graph.read(tx => getEntryProperties(A, {tx})), [
                    A1, A2, A3
                ]);
    
                // Get the properties of B
                assertEquals(await graph.read(tx => getEntryProperties(B, {tx})), [
                    // value A1 is inherited from Entry A, this entry's parent:
                    {...A1, source: {from: "AncestorEntry", entryId: A}},
                    B2, // <-- value B2 is set directly on this Entry B, and so A2 will not be inherited
                    // A3 is NOT inherited because we marked property 3 as non-inheritable.
                ]);
    
                // Get the properties of C
                assertEquals(await graph.read(tx => getEntryProperties(C, {tx})), [
                    // value A1 is inherited from Entry A, this entry's grandparent:
                    {...A1, source: {from: "AncestorEntry", entryId: A}},
                    {...B2, source: {from: "AncestorEntry", entryId: B}},
                    {...C3, source: {from: "ThisEntry"}},
                ]);
    
            });
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

    });
    */
});
