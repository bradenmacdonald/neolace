/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { assertEquals, group, setTestIsolation, test } from "neolace/lib/tests.ts";
import { getGraph } from "neolace/core/graph.ts";
import { CreateSite } from "neolace/core/Site.ts";
import { getCurrentSchema } from "neolace/core/schema/get-schema.ts";
import { SiteSchemaData } from "neolace/deps/neolace-sdk.ts";
import { schema as plantDbSchema } from "neolace/sample-data/plantdb/schema.ts";
import { ImportSchema } from "./import-schema.ts";
import { UseSystemSource } from "../edit/ApplyEdits.ts";

group("import-schema.ts", () => {
    // Note: importSchema() is used for the test fixtures so is also tested by all the tests in
    // neolace/rest-api/site/[siteKey]/schema/index.test.ts

    setTestIsolation(setTestIsolation.levels.BLANK_ISOLATED);

    group("Import a schema", () => {
        test("can import the example PlantDB schema", async () => {
            const graph = await getGraph();
            const site = await graph.runAsSystem(CreateSite({
                name: "Test Site",
                domain: "test.neolace.com",
                key: "test",
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
