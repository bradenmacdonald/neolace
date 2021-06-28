import { VNID } from "neolace/deps/vertex-framework.ts";
import { group, test, assertEquals, assertThrowsAsync, setTestIsolation } from "neolace/lib/tests.ts";
import { graph } from "neolace/core/graph.ts";
import { CreateSite } from "neolace/core/Site.ts";
import { getCurrentSchema } from "neolace/core/schema/get-schema.ts";
import { ApplyEdits } from "neolace/core/edit/ApplyEdits.ts";
import { ContentType, SiteSchemaData } from "neolace/deps/neolace-api.ts";

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
            await graph.runAsSystem(ApplyEdits({siteId: defaultData.site.id, edits: [
                {code: "CreateEntryType", data: {id, name }},
            ]}));

            assertEquals(await getSchema(), {
                entryTypes: {
                    ...defaultData.schema.entryTypes,
                    // Here is the new entry type:
                    [id]: {
                        id,
                        name,
                        contentType: ContentType.None,
                        description: null,
                        friendlyIdPrefix: null,
                    },
                },
                relationshipTypes: defaultData.schema.relationshipTypes,
            });
        });

        test("cannot add an entry type with the same ID as already exists for another site", async () => {
            // Create another site:
            const site2 = await graph.runAsSystem(CreateSite({slugId: "site-other", domain: "other.neolace.net"}));
            // Create a new entry type in site2:
            const id = VNID();
            const name = "NewEntryType";
            await graph.runAsSystem(ApplyEdits({siteId: site2.id, edits: [
                {code: "CreateEntryType", data: {id, name }},
            ]}));

            // Now try to create an entry with the same ID in the default site:
            await assertThrowsAsync(
                () => graph.runAsSystem(ApplyEdits({siteId: defaultData.site.id, edits: [
                    {code: "CreateEntryType", data: {id, name }},
                ]})),
                undefined,
                "already exists with label `VNode` and property `id`",
            )
        });
    });
});
