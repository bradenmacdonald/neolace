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
import { getCurrentSchema } from "neolace/core/schema/get-schema.ts";
import { ApplyEdits, UseSystemSource } from "neolace/core/edit/ApplyEdits.ts";
import { EntryTypeColor, SiteSchemaData } from "neolace/deps/neolace-sdk.ts";

group("schema.ts", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);
    const getSchema = (): Promise<SiteSchemaData> =>
        getGraph().then((graph) => graph.read((tx) => getCurrentSchema(tx, defaultData.site.id)));
    const getSchemaOtherSite = (): Promise<SiteSchemaData> =>
        getGraph().then((graph) => graph.read((tx) => getCurrentSchema(tx, defaultData.otherSite.id)));

    group("Schema Changes", () => {
        test("can add a new entry type.", async () => {
            const graph = await getGraph();
            // First make sure the schema is empty
            assertEquals(await getSchema(), defaultData.schema);

            // Create a new entry type:
            const key = "ET1";
            const name = "NewEntryType";
            await graph.runAsSystem(ApplyEdits({
                siteId: defaultData.site.id,
                edits: [
                    { code: "CreateEntryType", data: { key, name } },
                ],
                editSource: UseSystemSource,
            }));

            assertEquals(await getSchema(), {
                entryTypes: {
                    ...defaultData.schema.entryTypes,
                    // Here is the new entry type:
                    [key]: {
                        key,
                        name,
                        description: "",
                        keyPrefix: "",
                        enabledFeatures: {},
                        color: EntryTypeColor.Default,
                        abbreviation: "",
                    },
                },
                properties: defaultData.schema.properties,
            });
        });

        test("can add an entry type with the same key as already exists for another site", async () => {
            const graph = await getGraph();
            // Create two entry types on different sites with the same key but different names:
            const key = "ET1";
            await graph.runAsSystem(ApplyEdits({
                siteId: defaultData.site.id,
                edits: [
                    { code: "CreateEntryType", data: { key, name: "ET on Default Site" } },
                ],
                editSource: UseSystemSource,
            }));
            await graph.runAsSystem(ApplyEdits({
                siteId: defaultData.otherSite.id,
                edits: [
                    { code: "CreateEntryType", data: { key, name: "ET on Other Site" } },
                ],
                editSource: UseSystemSource,
            }));

            const updatedSchema = await getSchema();
            const otherUpdatedSchema = await getSchemaOtherSite();
            assertEquals(updatedSchema.entryTypes[key].name, "ET on Default Site");
            assertEquals(otherUpdatedSchema.entryTypes[key].name, "ET on Other Site");
        });
    });
});
