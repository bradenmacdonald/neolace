import { VNID } from "neolace/deps/vertex-framework.ts";
import { RelationshipCategory, ContentType } from "neolace/deps/neolace-api.ts";

import { group, test, setTestIsolation, assertEquals } from "neolace/lib/tests.ts";
import { graph } from "neolace/core/graph.ts";
import { CreateSite } from "neolace/core/Site.ts";
import { ApplyEdits } from "neolace/core/edit/ApplyEdits.ts";
import { getEntryProperties } from "neolace/core/entry/properties.ts";

group(import.meta, () => {

    group("getProperties", () => {

        setTestIsolation(setTestIsolation.levels.BLANK_ISOLATED);

        // Entry Type IDs:
        const entryType = VNID(), propertyType = VNID();
        // Relationship Type IDs:
        const entryIsA = VNID(), entryHasProp = VNID();
        // Entry IDs:
        const A = VNID(), B = VNID(), C = VNID(), prop1 = VNID(), prop2 = VNID(), prop3 = VNID();
        // Simple Property Value IDs:
        const spv1 = VNID(), spv2 = VNID();

        test("Returns no properties for a blank entry, returns a basic property for an entry with a property", async () => {

            // Create a site with:
            //   Entry A has no properties
            //   Entry B has one property
            const {id: siteId} = await graph.runAsSystem(CreateSite({name: "Test Site", domain: "test-site.neolace.net", slugId: "site-test"}));
            await graph.runAsSystem(ApplyEdits({siteId, edits: [
                {code: "CreateEntryType", data: {id: entryType, name: "EntryType", contentType: ContentType.None}},
                {code: "CreateEntryType", data: {id: propertyType, name: "PropertyType", contentType: ContentType.Property}},
                {code: "CreateRelationshipType", data: {id: entryHasProp, category: RelationshipCategory.HAS_PROPERTY, nameForward: "has prop", nameReverse: "prop of"}},
                {code: "UpdateRelationshipType", data: {id: entryHasProp, addFromTypes: [entryType], addToTypes: [propertyType]}},
                {code: "CreateEntry", data: {id: A, name: "Entry A", type: entryType, friendlyId: "a", description: ""}},
                {code: "CreateEntry", data: {id: B, name: "Entry B", type: entryType, friendlyId: "b", description: ""}},
                {code: "CreateEntry", data: {id: prop1, name: "Property 1", type: propertyType, friendlyId: "p1", description: ""}},
                {code: "UpdatePropertyValue", data: {entry: B, property: prop1, valueExpression: `"value for B prop1"`, note: ""}},
            ]}));

            // Get the properties of A
            assertEquals(await graph.read(tx => getEntryProperties(A, {tx})), [
                // No properties
            ]);

            // Get the properties of B
            assertEquals(await graph.read(tx => getEntryProperties(B, {tx})), [
                {
                    label: "Property 1",
                    valueExpression: '"value for B prop1"',
                    importance: 10,  // Default importance
                    id: null,  // Only SimplePropertyValues have ID; "regular" properties use the property entry's ID.
                    property: {id: prop1},
                    note: "",
                    type: "PropertyValue",
                    source: {from: "ThisEntry"},
                },
            ]);

        });

        test("Returns SimplePropertyValues set on the entry type", async () => {

            // Create a site with:
            //   Entry A has an entry type with two simple property values
            //   Entry "Property 1" has an entry type with no simple property values
            const {id: siteId} = await graph.runAsSystem(CreateSite({name: "Test Site", domain: "test-site.neolace.net", slugId: "site-test"}));
            await graph.runAsSystem(ApplyEdits({siteId, edits: [
                {code: "CreateEntryType", data: {id: entryType, name: "EntryType", contentType: ContentType.None}},
                {code: "CreateEntryType", data: {id: propertyType, name: "PropertyType", contentType: ContentType.Property}},
                {code: "UpdateEntryType", data: {id: entryType, addOrUpdateSimpleProperties: [
                    {id: spv1, importance: 50, note: "Test note", valueExpression: `"spv1 value"`, label: "SPV 1 Label"},
                    {id: spv2, importance: 1, note: "Test note", valueExpression: `"spv2 value"`, label: "SPV 2 Label"},
                ]}},
                {code: "CreateEntry", data: {id: A, name: "Entry A", type: entryType, friendlyId: "a", description: ""}},
                {code: "CreateEntry", data: {id: prop1, name: "Property 1", type: propertyType, friendlyId: "p1", description: ""}},
            ]}));

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
                    property: null,
                    note: "Test note",
                    type: "SimplePropertyValue",
                    source: {from: "EntryType"},
                },
                {
                    label: "SPV 1 Label",
                    valueExpression: '"spv1 value"',
                    importance: 50,  // Less important than 1
                    id: spv1,
                    property: null,
                    note: "Test note",
                    type: "SimplePropertyValue",
                    source: {from: "EntryType"},
                },
            ]);

        });

        
        test("Returns inherited properties from parent entries, if the property is marked as inheritable", async () => {

            // Create a site with:
            //   Entry A has prop1 = A1, prop2 = A2, prop3 = A3
            //   Entry B has             prop2 = B2
            //   Entry C has                         prop3 = C3
            //   C inherits from B which inherits from A
            //   Property 3 is not inheritable, but the others are.
            const {id: siteId} = await graph.runAsSystem(CreateSite({name: "Test Site", domain: "test-site.neolace.net", slugId: "site-test"}));
            await graph.runAsSystem(ApplyEdits({siteId, edits: [
                {code: "CreateEntryType", data: {id: entryType, name: "EntryType", contentType: ContentType.None}},
                {code: "CreateEntryType", data: {id: propertyType, name: "PropertyType", contentType: ContentType.Property}},
                {code: "CreateRelationshipType", data: {id: entryIsA, category: RelationshipCategory.IS_A, nameForward: "is a", nameReverse: "has types"}},
                {code: "UpdateRelationshipType", data: {id: entryIsA, addFromTypes: [entryType], addToTypes: [entryType]}},
                {code: "CreateRelationshipType", data: {id: entryHasProp, category: RelationshipCategory.HAS_PROPERTY, nameForward: "has prop", nameReverse: "prop of"}},
                {code: "UpdateRelationshipType", data: {id: entryHasProp, addFromTypes: [entryType], addToTypes: [propertyType]}},
                // Create properties:
                {code: "CreateEntry", data: {id: prop1, name: "Property 1", type: propertyType, friendlyId: "p1", description: ""}},
                {code: "UpdatePropertyEntry", data: {id: prop1, inherits: true}},
                {code: "CreateEntry", data: {id: prop2, name: "Property 2", type: propertyType, friendlyId: "p2", description: ""}},
                {code: "UpdatePropertyEntry", data: {id: prop2, inherits: true}},
                {code: "CreateEntry", data: {id: prop3, name: "Property 3", type: propertyType, friendlyId: "p3", description: ""}},
                {code: "UpdatePropertyEntry", data: {id: prop3, inherits: false}},
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

            // Define the expected property values:
            const A1 = {
                label: "Property 1",
                valueExpression: '"A1"',
                importance: 10,  // Default importance
                id: null,  // Only SimplePropertyValues have ID; "regular" properties use the property entry's ID.
                property: {id: prop1},
                note: "",
                type: "PropertyValue",
                source: {from: "ThisEntry"},
            };
            const A2 = {...A1, label: "Property 2", valueExpression: '"A2"', property: {id: prop2}};
            const A3 = {...A1, label: "Property 3", valueExpression: '"A3"', property: {id: prop3}};
            const B2 = {...A1, label: "Property 2", valueExpression: '"B2"', property: {id: prop2}};
            const C3 = {...A1, label: "Property 3", valueExpression: '"C3"', property: {id: prop3}};

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

        // TODO: pagination, filtering, (total count?)

    });
});
