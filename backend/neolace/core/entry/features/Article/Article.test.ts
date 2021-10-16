import { VNID } from "neolace/deps/vertex-framework.ts";

import { dedent } from "neolace/lib/dedent.ts";
import { group, test, setTestIsolation, assertEquals } from "neolace/lib/tests.ts";
import { graph } from "neolace/core/graph.ts";
import { CreateSite } from "neolace/core/Site.ts";
import { ApplyEdits } from "neolace/core/edit/ApplyEdits.ts";
import { getCurrentSchema } from "neolace/core/schema/get-schema.ts";
import { getEntryFeatureData } from "../get-feature-data.ts";

group(import.meta, () => {

    setTestIsolation(setTestIsolation.levels.BLANK_ISOLATED);

    // Entry Type IDs:
    const entryType = VNID();

    test("Can be added to schema, shows up on schema, can be removed from schema", async () => {

        // Create a site with one entry type:
        const {id: siteId} = await graph.runAsSystem(CreateSite({name: "Site 1", domain: "test-site1.neolace.net", slugId: "site-test1"}));
        await graph.runAsSystem(ApplyEdits({siteId, edits: [
            {code: "CreateEntryType", data: {id: entryType, name: "EntryType"}},
        ]}));

        // Now get the schema, without the "Article" feature enabled yet:
        const beforeSchema = await graph.read(tx => getCurrentSchema(tx, siteId));
        // No features should be enabled:
        assertEquals(beforeSchema.entryTypes[entryType].enabledFeatures, {});

        // Now enable the "Article" Feature
        await graph.runAsSystem(ApplyEdits({siteId, edits: [
            {code: "UpdateEntryTypeFeature", data: {entryTypeId: entryType, feature: {
                featureType: "Article",
                enabled: true,
                config: {},
            }}},
        ]}));
        // Now check the updated schema:
        const afterSchema = await graph.read(tx => getCurrentSchema(tx, siteId));
        // The "Article" feature should be enabled:
        assertEquals(afterSchema.entryTypes[entryType].enabledFeatures, {
            Article: {},
        });

        // Now disable the "Article" feature:
        await graph.runAsSystem(ApplyEdits({siteId, edits: [
            {code: "UpdateEntryTypeFeature", data: {entryTypeId: entryType, feature: {
                featureType: "Article",
                enabled: false,
            }}},
        ]}));
        // The schema should return to the initial version:
        assertEquals(
            await graph.read(tx => getCurrentSchema(tx, siteId)),
            beforeSchema,
        );
    });

    test("Can be set on an entry and loaded using getEntryFeatureData()", async () => {
        const entryId = VNID();
        // Create a site with an entry type that has the article feature::
        const {id: siteId} = await graph.runAsSystem(CreateSite({name: "Site 1", domain: "test-site1.neolace.net", slugId: "site-test1"}));
        await graph.runAsSystem(ApplyEdits({siteId, edits: [
            {code: "CreateEntryType", data: {id: entryType, name: "EntryType"}},
            {code: "UpdateEntryTypeFeature", data: {entryTypeId: entryType, feature: {
                featureType: "Article",
                enabled: true,
                config: {},
            }}},
            // Create an entry:
            {code: "CreateEntry", data: {id: entryId, type: entryType, name: "Test Entry", friendlyId: "other-entry", description: "An Entry for Testing"}},
        ]}));

        // At first, since the "Article" feature is enabled for this entry type, it has the default Article data:
        const before = await graph.read(tx => getEntryFeatureData(entryId, {featureType: "Article", tx}));
        assertEquals(before, {
            articleMD: "",
            headings: [],
        });

        ////////////////////////////////////////////////////////////////////////////
        // Now configure the entry's Article feature:
        await graph.runAsSystem(ApplyEdits({siteId, edits: [
            {code: "UpdateEntryFeature", data: {entryId, feature: {
                featureType: "Article",
                articleMD: dedent`
                    # Heading 1

                    # Same Heading

                    # Same Heading

                    This is some text. The heading above is repeated, but should get a unique ID.
                `
            }}},
        ]}));

        ////////////////////////////////////////////////////////////////////////////
        // Now we should see the article on the entry and also get its headings:
        const after = await graph.read(tx => getEntryFeatureData(entryId, {featureType: "Article", tx}));
        assertEquals(after, {
            articleMD: "# Heading 1\n\n# Same Heading\n\n# Same Heading\n\nThis is some text. The heading above is repeated, but should get a unique ID.",
            headings: [
                {title: "Heading 1", id: "heading-1"},
                {title: "Same Heading", id: "same-heading"},
                {title: "Same Heading", id: "same-heading-1"},
            ],
        });
    });

});
