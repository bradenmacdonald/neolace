import { SiteSchemaData } from "neolace-api";
import { defineAction, VNID } from "vertex-framework";
import { ApplyEdits } from "../edit/ApplyEdits";
import { getCurrentSchema, diffSchema } from "./get-schema";


/**
 * Import a schema, replacing a site's current schema (if any) with a new schema
 */
 export const ImportSchema = defineAction({
    type: "ImportSchema",
    parameters: {} as {
        siteId: VNID;
        schema: SiteSchemaData
    },
    resultData: {},
    apply: async (tx, data) => {

        const currentSchema = await getCurrentSchema(tx, data.siteId);
        const editSet = diffSchema(currentSchema, data.schema);
        const result = await ApplyEdits.apply(tx, {siteId: data.siteId, edits: editSet.edits});

        const numEntryTypes = Object.keys(data.schema.entryTypes).length;
        const numRelationshipTypes = Object.keys(data.schema.relationshipTypes).length;

        return {
            resultData: {},
            modifiedNodes: result.modifiedNodes,
            description: `Imported schema (${numEntryTypes} entry types, ${numRelationshipTypes} relationship types)`,
        };
    },
});
