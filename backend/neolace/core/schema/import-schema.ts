import { SiteSchemaData } from "neolace/deps/neolace-api.ts";
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
