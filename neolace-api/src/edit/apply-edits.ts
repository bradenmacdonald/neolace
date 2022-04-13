import type { EditableEntryData } from "../content/Entry.ts";
import type { SiteSchemaData } from "../schema/SiteSchemaData.ts";
import { EditList, getEditType } from "./AnyEdit.ts";
import { EditChangeType } from "./Edit.ts";

/**
 * Given an entry (in "EditableEntryData" format) and a list of edits, apply any relevant edits to the entry and return
 * the result. Edits which don't affect the specified entry will be automatically skipped.
 */
export function applyEditsToEntry(baseEntry: Readonly<EditableEntryData>, baseSchema: SiteSchemaData, edits: EditList): EditableEntryData {

    let entry: EditableEntryData = {...baseEntry};
    let schema: SiteSchemaData = {
        entryTypes: {...baseSchema.entryTypes},
        properties: {...baseSchema.properties},
    };

    for (const edit of edits) {
        const editType = getEditType(edit.code);
        if (editType.changeType === EditChangeType.Content) {
            entry = editType.apply(entry, edit.data, schema);
        } else {
            // Update the schema as we go since the "current" schema affect an edit.
            schema = editType.apply(schema, edit.data);
        }
    }
    return entry;
}

/**
 * Given a schema and a list of edits, apply any schema edits in the list and return the resulting modified schema.
 */
export function applyEditsToSchema(baseSchema: SiteSchemaData, edits: EditList): SiteSchemaData {

    let schema: SiteSchemaData = {
        entryTypes: {...baseSchema.entryTypes},
        properties: {...baseSchema.properties},
    };

    for (const edit of edits) {
        const editType = getEditType(edit.code);
        if (editType.changeType === EditChangeType.Schema) {
            schema = editType.apply(schema, edit.data);
        }
    }
    return schema;
}
