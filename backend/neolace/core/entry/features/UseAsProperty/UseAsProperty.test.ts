import { VNID } from "neolace/deps/vertex-framework.ts";
import { InvalidFieldValue } from "neolace/deps/neolace-api.ts";

import { group, test, setTestIsolation, assertEquals, assertRejects } from "neolace/lib/tests.ts";
import { graph } from "neolace/core/graph.ts";
import { CreateSite } from "neolace/core/Site.ts";
import { ApplyEdits } from "neolace/core/edit/ApplyEdits.ts";
import { getCurrentSchema } from "neolace/core/schema/get-schema.ts";
import { getEntryFeaturesData } from "../get-feature-data.ts";

group(import.meta, () => {

    setTestIsolation(setTestIsolation.levels.BLANK_ISOLATED);

    // Entry Type IDs:
    const entryType = VNID(), propertyType = VNID();

    test("Can be added to schema, shows up on schema, can be removed from schema", async () => {

        // Create a site with two types of entries, EntryType and PropertyType:
        const {id: siteId} = await graph.runAsSystem(CreateSite({name: "Site 1", domain: "test-site1.neolace.net", slugId: "site-test1"}));
        await graph.runAsSystem(ApplyEdits({siteId, edits: [
            {code: "CreateEntryType", data: {id: entryType, name: "EntryType"}},
            {code: "CreateEntryType", data: {id: propertyType, name: "PropertyType"}},
        ]}));

        // Now get the schema, without the "UseAsProperty" feature enabled yet:
        const beforeSchema = await graph.read(tx => getCurrentSchema(tx, siteId));
        // No features should be enabled:
        assertEquals(beforeSchema.entryTypes[propertyType].enabledFeatures, {});

        // Now enable the "Use As Property Feature"
        await graph.runAsSystem(ApplyEdits({siteId, edits: [
            {code: "UpdateEntryTypeFeature", data: {entryTypeId: propertyType, feature: {
                featureType: "UseAsProperty",
                enabled: true,
                config: {appliesToEntryTypes: [entryType]},
            }}},
        ]}));
        // Now check the updated schema:
        const afterSchema = await graph.read(tx => getCurrentSchema(tx, siteId));
        // The "use as property" feature should be enabled:
        assertEquals(afterSchema.entryTypes[propertyType].enabledFeatures, {
            UseAsProperty: {
                appliesToEntryTypes: [entryType],
            },
        });
        // The EntryType schema should be unchanged - only the PropertyType schema has changed:
        assertEquals(afterSchema.entryTypes[entryType], beforeSchema.entryTypes[entryType]);

        // Now disable the "Use As Property" feature:
        await graph.runAsSystem(ApplyEdits({siteId, edits: [
            {code: "UpdateEntryTypeFeature", data: {entryTypeId: propertyType, feature: {
                featureType: "UseAsProperty",
                enabled: false,
            }}},
        ]}));
        // The schema should return to the initial version:
        assertEquals(
            await graph.read(tx => getCurrentSchema(tx, siteId)),
            beforeSchema,
        );
    });

    test("Cannot create properties that APPLIES_TO entry types from another site or with invalid IDs.", async () => {

        const [{id: siteId1}, {id: siteId2}] = await Promise.all([
            graph.runAsSystem(CreateSite({name: "Site 1", domain: "test-site1.neolace.net", slugId: "site-test1"})),
            graph.runAsSystem(CreateSite({name: "Site 2", domain: "test-site2.neolace.net", slugId: "site-test2"}))
        ]);
        // Create an entry type on site 2:
        const entryTypeSite2 = VNID();
        await graph.runAsSystem(ApplyEdits({siteId: siteId2, edits: [
            {code: "CreateEntryType", data: {id: entryTypeSite2, name: "Entry Type on Another Site"}},
        ]}));
        // Now create entry types on site 1:
        await graph.runAsSystem(ApplyEdits({siteId: siteId1, edits: [
            {code: "CreateEntryType", data: {id: entryType, name: "EntryType"}},
            {code: "CreateEntryType", data: {id: propertyType, name: "PropertyType"}},
        ]}));
        // Now try to say that "EntryType" can be used as a properties for "Entry Type on Another Site"
        await assertRejects(
            () => graph.runAsSystem(ApplyEdits({siteId: siteId1, edits: [
                {code: "UpdateEntryTypeFeature", data: {entryTypeId: propertyType, feature: {
                    featureType: "UseAsProperty",
                    enabled: true,
                    config: {appliesToEntryTypes: [entryTypeSite2]},
                }}},
            ]})),
            InvalidFieldValue,
            "Invalid EntryType ID",
        );
        // Now try an invalid ID
        await assertRejects(
            () => graph.runAsSystem(ApplyEdits({siteId: siteId1, edits: [
                {code: "UpdateEntryTypeFeature", data: {entryTypeId: propertyType, feature: {
                    featureType: "UseAsProperty",
                    enabled: true,
                    config: {appliesToEntryTypes: [entryTypeSite2]},
                }}},
            ]})),
            InvalidFieldValue,
            "Invalid EntryType ID",
        );

    });

    test("Can be set on an entry and loaded using getEntryFeaturesData()", async () => {
        const entryId = VNID();
        // Create a site with two types of entries, EntryType and PropertyType:
        const {id: siteId} = await graph.runAsSystem(CreateSite({name: "Site 1", domain: "test-site1.neolace.net", slugId: "site-test1"}));
        await graph.runAsSystem(ApplyEdits({siteId, edits: [
            {code: "CreateEntryType", data: {id: entryType, name: "EntryType"}},
            {code: "CreateEntryType", data: {id: propertyType, name: "PropertyType"}},
            {code: "UpdateEntryTypeFeature", data: {entryTypeId: propertyType, feature: {
                featureType: "UseAsProperty",
                enabled: true,
                config: {appliesToEntryTypes: [entryType]},
            }}},
            // Create an entry of each type:
            {code: "CreateEntry", data: {id: VNID(), type: entryType, name: "Test Entry", friendlyId: "other-entry", description: "An Entry for Testing"}},
            {code: "CreateEntry", data: {id: entryId, type: propertyType, name: "Test PropertyEntry", friendlyId: "test", description: "A PropertyEntry for Testing"}},
        ]}));

        // At first, even though the "UseAsProperty" feature is enabled for this entry type, it has no UseAsProperty data:
        const before = await graph.read(tx => getEntryFeaturesData(entryId, {tx}));
        assertEquals(before.UseAsProperty, undefined);

        ////////////////////////////////////////////////////////////////////////////
        // Now configure the entry's UseAsProperty feature:
        await graph.runAsSystem(ApplyEdits({siteId, edits: [
            {code: "UpdateEntryFeature", data: {entryId, feature: {
                featureType: "UseAsProperty",
                importance: 40,
                inherits: true,
            }}},
        ]}));

        ////////////////////////////////////////////////////////////////////////////
        // Now we should see the image on the entry:
        const after = await graph.read(tx => getEntryFeaturesData(entryId, {tx}));
        assertEquals(after.UseAsProperty, {
            importance: 40,
            inherits: true,
            displayAs: null,
        });
    });

});
