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
                    id: null,  // Only SimplePropertyValues have ID; "regular" properties use the property ID.
                    property: {id: prop1},
                    note: "",
                    type: "PropertyFact",
                    source: null,  // source is null because this is "directly" attached to the entry
                },
            ]);

        });

    });
});
