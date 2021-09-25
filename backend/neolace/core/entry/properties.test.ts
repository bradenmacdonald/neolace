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
        const A = VNID(), B = VNID(), prop1 = VNID(), prop2 = VNID();
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
                    type: "PropertyFact",
                    source: null,  // source is null because this is "directly" attached to the entry
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
                    source: "EntryType",
                },
                {
                    label: "SPV 1 Label",
                    valueExpression: '"spv1 value"',
                    importance: 50,  // Less important than 1
                    id: spv1,
                    property: null,
                    note: "Test note",
                    type: "SimplePropertyValue",
                    source: "EntryType",
                },
            ]);

        });

        // TODO: test inherited entries

        // TODO: pagination, filtering, (total count?)

        // TODO: remove references to PropertyFact, it's an implementation detail

    });
});
