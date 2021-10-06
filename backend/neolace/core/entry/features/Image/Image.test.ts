import { VNID } from "neolace/deps/vertex-framework.ts";

import { group, test, setTestIsolation, assertEquals } from "neolace/lib/tests.ts";
import { graph } from "neolace/core/graph.ts";
import { CreateSite } from "neolace/core/Site.ts";
import { ApplyEdits } from "neolace/core/edit/ApplyEdits.ts";
import { getCurrentSchema } from "neolace/core/schema/get-schema.ts";

group(import.meta, () => {

    setTestIsolation(setTestIsolation.levels.BLANK_ISOLATED);

    // Entry Type ID:
    const entryType = VNID();

    test("Can be added to schema, shows up on schema, can be removed from schema", async () => {

        // Create a site with two types of entries, EntryType and PropertyType:
        const {id: siteId} = await graph.runAsSystem(CreateSite({name: "Site 1", domain: "test-site1.neolace.net", slugId: "site-test1"}));
        await graph.runAsSystem(ApplyEdits({siteId, edits: [
            {code: "CreateEntryType", data: {id: entryType, name: "EntryType"}},
        ]}));

        // Now get the schema, without the "UseAsProperty" feature enabled yet:
        const beforeSchema = await graph.read(tx => getCurrentSchema(tx, siteId));
        // No features should be enabled:
        assertEquals(beforeSchema.entryTypes[entryType].enabledFeatures, {});

        // Now enable the "Image Feature"
        await graph.runAsSystem(ApplyEdits({siteId, edits: [
            {code: "UpdateEntryTypeFeature", data: {entryTypeId: entryType, feature: {
                featureType: "Image",
                enabled: true,
                config: {},
            }}},
        ]}));
        // Now check the updated schema:
        const afterSchema = await graph.read(tx => getCurrentSchema(tx, siteId));
        // The "Image" feature should be enabled:
        assertEquals(afterSchema.entryTypes[entryType].enabledFeatures, {
            Image: {},
        });

        // Now disable the "Image" feature:
        await graph.runAsSystem(ApplyEdits({siteId, edits: [
            {code: "UpdateEntryTypeFeature", data: {entryTypeId: entryType, feature: {
                featureType: "Image",
                enabled: false,
            }}},
        ]}));
        // The schema should return to the initial version:
        assertEquals(
            await graph.read(tx => getCurrentSchema(tx, siteId)),
            beforeSchema,
        );
    });

});
