import { assertEquals, group, setTestIsolation, test } from "neolace/lib/tests.ts";
import { getGraph } from "neolace/core/graph.ts";
import { CreateSite } from "neolace/core/Site.ts";
import { getCurrentSchema } from "neolace/core/schema/get-schema.ts";
import { SiteSchemaData } from "neolace/deps/neolace-api.ts";
import { schema as plantDbSchema } from "neolace/sample-data/plantdb/schema.ts";
import { ImportSchema } from "./import-schema.ts";
import { UseSystemSource } from "../edit/ApplyEdits.ts";

group("import-schema.ts", () => {
    // Note: importSchema() is used for the test fixtures so is also tested by all the tests in
    // neolace/api/site/{siteShortId}/schema/index.test.ts

    setTestIsolation(setTestIsolation.levels.BLANK_ISOLATED);

    group("Import a schema", () => {
        test("can import the example PlantDB schema", async () => {
            const graph = await getGraph();
            const site = await graph.runAsSystem(CreateSite({
                name: "Test Site",
                domain: "test.neolace.com",
                slugId: "site-test",
                //adminUser: ,
            }));
            const getSchema = (): Promise<SiteSchemaData> => graph.read((tx) => getCurrentSchema(tx, site.id));

            // First make sure the schema is empty
            assertEquals(await getSchema(), {
                entryTypes: {},
                properties: {},
            });

            // Now import the schema
            await graph.runAsSystem(ImportSchema({
                siteId: site.id,
                schema: plantDbSchema,
                editSource: UseSystemSource,
            }));

            // Now validate it
            assertEquals(await getSchema(), plantDbSchema);
        });
    });
});
