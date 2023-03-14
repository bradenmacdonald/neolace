/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { SiteSchemaData } from "neolace/deps/neolace-sdk.ts";
import { defineAction, VNID } from "neolace/deps/vertex-framework.ts";
import { ApplyEdits, UseSystemSource } from "neolace/core/edit/ApplyEdits.ts";
import { diffSchema, getCurrentSchema } from "neolace/core/schema/get-schema.ts";

/**
 * Import a schema, replacing a site's current schema (if any) with a new schema
 */
export const ImportSchema = defineAction({
    type: "ImportSchema",
    parameters: {} as {
        siteId: VNID;
        schema: SiteSchemaData;
        editSource: VNID | typeof UseSystemSource;
    },
    resultData: {},
    apply: async (tx, data) => {
        const currentSchema = await getCurrentSchema(tx, data.siteId);
        const editSet = diffSchema(currentSchema, data.schema);
        const result = await ApplyEdits.apply(tx, {
            siteId: data.siteId,
            edits: editSet.edits,
            editSource: data.editSource,
        });

        const numEntryTypes = Object.keys(data.schema.entryTypes).length;
        const numProperties = Object.keys(data.schema.properties).length;

        return {
            resultData: {},
            modifiedNodes: result.modifiedNodes,
            description: `Imported schema (${numEntryTypes} entry types, ${numProperties} properties)`,
        };
    },
});
