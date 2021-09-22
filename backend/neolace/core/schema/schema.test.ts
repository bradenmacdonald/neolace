import { VNID } from "neolace/deps/vertex-framework.ts";
import { group, test, assertEquals, assertThrowsAsync, setTestIsolation } from "neolace/lib/tests.ts";
import { graph } from "neolace/core/graph.ts";
import { CreateSite } from "neolace/core/Site.ts";
import { getCurrentSchema } from "neolace/core/schema/get-schema.ts";
import { ApplyEdits } from "neolace/core/edit/ApplyEdits.ts";
import { ContentType, SiteSchemaData, RelationshipCategory } from "neolace/deps/neolace-api.ts";

group(import.meta, () => {

    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);
    const getSchema = (): Promise<SiteSchemaData> => graph.read(tx => getCurrentSchema(tx, defaultData.site.id));

    group("Schema Changes", () => {

        test("can add a new entry type.", async () => {
            // First make sure the schema is empty
            assertEquals(await getSchema(), defaultData.schema);

            // Create a new entry type:
            const id = VNID();
            const name = "NewEntryType";
            const contentType = ContentType.None;
            await graph.runAsSystem(ApplyEdits({siteId: defaultData.site.id, edits: [
                {code: "CreateEntryType", data: {id, name, contentType }},
            ]}));

            assertEquals(await getSchema(), {
                entryTypes: {
                    ...defaultData.schema.entryTypes,
                    // Here is the new entry type:
                    [id]: {
                        id,
                        name,
                        contentType,
                        description: null,
                        friendlyIdPrefix: null,
                        simplePropValues: {},
                    },
                },
                relationshipTypes: defaultData.schema.relationshipTypes,
            });
        });

        test("cannot add an entry type with the same ID as already exists for another site", async () => {
            // Create another site:
            const site2 = await graph.runAsSystem(CreateSite({name: "Other Site", slugId: "site-other", domain: "other.neolace.net"}));
            // Create a new entry type in site2:
            const id = VNID();
            const name = "NewEntryType";
            await graph.runAsSystem(ApplyEdits({siteId: site2.id, edits: [
                {code: "CreateEntryType", data: {id, name, contentType: ContentType.None }},
            ]}));

            // Now try to create an entry with the same ID in the default site:
            await assertThrowsAsync(
                () => graph.runAsSystem(ApplyEdits({siteId: defaultData.site.id, edits: [
                    {code: "CreateEntryType", data: {id, name, contentType: ContentType.None }},
                ]})),
                undefined,
                "already exists with label `VNode` and property `id`",
            )
        });

        test("cannot create a HAS_PROPERTY relationship to a non-property EntryType", async () => {
            // Create another site:
            const site2 = await graph.runAsSystem(CreateSite({name: "Other Site", slugId: "site-other", domain: "other.neolace.net"}));
            // Create a new entry type in site2:
            const entryTypeId = VNID();
            const name = "NewEntryType";
            const relTypeId = VNID();
            await graph.runAsSystem(ApplyEdits({siteId: site2.id, edits: [
                {code: "CreateEntryType", data: {id: entryTypeId, name, contentType: ContentType.None }},
                {code: "CreateRelationshipType", data: {id: relTypeId, category: RelationshipCategory.HAS_PROPERTY, nameForward: "has property", nameReverse: "applies to" }},
            ]}));

            // Now try to create an entry with the same ID in the default site:
            await assertThrowsAsync(
                () => graph.runAsSystem(ApplyEdits({siteId: site2.id, edits: [
                    {code: "UpdateRelationshipType", data: {id: relTypeId, addToTypes: [entryTypeId],
                        // FIXME: issue with computed-types - it shouldn't be necessary to specify all these:
                        nameForward: undefined,
                        nameReverse: undefined,
                        addFromTypes: undefined,
                        description: undefined,
                        removeFromTypes: undefined,
                        removeToTypes: undefined,
                     }},
                ]})),
                undefined,
                "UpdateRelationshipType.addToTypes: Cannot create a HAS_PROPERTY RelationshipType to an EntryType unless that EntryType has ContentType=Property",
            )
        });
    });
});
