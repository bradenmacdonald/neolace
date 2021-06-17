import { VNID } from "vertex-framework";
import { suite, test, assert, beforeEach, assertRejects, setTestIsolation } from "../../lib/intern-tests";
import { graph } from "../graph";
import { CreateSite } from "../Site";
import { getCurrentSchema } from "./get-schema";
import { ApplyEdits } from "../edit/ApplyEdits";
import { ContentType, SiteSchemaData } from "neolace-api";

suite(__filename, () => {

    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);
    const getSchema = (): Promise<SiteSchemaData> => graph.read(tx => getCurrentSchema(tx, defaultData.site.id));

    suite("Schema Changes", () => {

        test("can add a new entry type.", async () => {
            // First make sure the schema is empty
            assert.deepStrictEqual(await getSchema(), defaultData.schema);

            // Create a new entry type:
            const id = VNID();
            const name = "NewEntryType";
            await graph.runAsSystem(ApplyEdits({siteId: defaultData.site.id, edits: [
                {code: "CreateEntryType", data: {id, name }},
            ]}));

            assert.deepStrictEqual(await getSchema(), {
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
            await assertRejects(
                graph.runAsSystem(ApplyEdits({siteId: defaultData.site.id, edits: [
                    {code: "CreateEntryType", data: {id, name }},
                ]})),
                "already exists with label `VNode` and property `id`",
            )
        });
    });
});
