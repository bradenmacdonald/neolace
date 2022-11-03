import type { EditableEntryData } from "../content/Entry.ts";
import { ReferenceCacheData } from "../content/reference-cache.ts";
import { AnySchemaEdit } from "../schema/SchemaEdit.ts";
import type { SiteSchemaData } from "../schema/SiteSchemaData.ts";
import { EditList, getEditType } from "./AnyEdit.ts";
import { AnyContentEdit } from "./ContentEdit.ts";
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

/**
 * Given a Reference Cache (which has summary data about entries, entry types, and properties), update it with whatever
 * edits have been made in the given list of edits.
 *
 * This can be used with the "autocomplete" API in the context of a draft, to update the results with edits from the
 * draft.
 */
export function applyEditsToReferenceCache(prevRefCache: Readonly<ReferenceCacheData>, edits: Readonly<EditList>) {

    const entries: ReferenceCacheData["entries"] = {...prevRefCache.entries};

    let schema: SiteSchemaData = {
        entryTypes: Object.fromEntries(Object.values(prevRefCache.entryTypes).map((et) => [et.id, {
            ...et,
            // Add in placeholders for the following fields which aren't used in ReferenceCache but are used in the full schema:
            description: "",
            friendlyIdPrefix: "",
            enabledFeatures: {},
        }])),
        properties: Object.fromEntries(Object.values(prevRefCache.properties).map((prop) => [prop.id, {
            ...prop,
            // Add in placeholders for the following fields which aren't used in ReferenceCache but are used in the full schema:
            description: undefined,
            descriptionMD: prop.description,  // TODO: Fix these names to be consistent: description or descriptionMD
            appliesTo: [],
        }])),
    };

    for (let edit of edits) {
        const editType = getEditType(edit.code);
        if (editType.changeType === EditChangeType.Schema) {
            edit = edit as AnySchemaEdit;
            if (edit.code === "UpdateProperty") {
                if (schema.properties[edit.data.id] === undefined) {
                    // This property isn't yet in the reference cache.
                    continue; // Ignore it.
                }
                // Remove "appliesTo": It's not relevant to reference cache and will throw an exception if any entry types aren't in the reference cache
                const {appliesTo: _, ...data} = edit.data;
                schema = editType.apply(schema, data);
            } else {
                schema = editType.apply(schema, edit.data);
            }
        } else {
            edit = edit as AnyContentEdit;
            const entryId = edit.data.entryId;
                if (edit.code === "CreateEntry") {
                    const {type, entryId: _, ...otherData} = edit.data;
                    entries[entryId] = {id: entryId, ...otherData, entryType: {id: type}};
                } else if (!(entryId in entries)) {
                    continue;
                } else if (edit.code === "SetEntryName") {
                    entries[entryId].name = edit.data.name;
                } else if (edit.code === "SetEntryDescription") {
                    entries[entryId].description = edit.data.description;
                } else if (edit.code === "SetEntryFriendlyId") {
                    entries[entryId].friendlyId = edit.data.friendlyId
                } else {
                    // Doesn't affect the data that we keep in refCache, so ignore it.
                }
        }
    }
    const refCache: ReferenceCacheData = {
        entries,
        entryTypes: {...schema.entryTypes},
        // Any lookup values may now be invalid, but we leave them unchanged anyways as that's less problematic than removing them.
        lookups: [...prevRefCache.lookups],
        properties: Object.fromEntries(Object.values(schema.properties).map((prop) => [prop.id, {
            ...prop,
            description: prop.descriptionMD,
            descriptionMD: undefined,
            standardURL: prop.standardURL ?? "",
            displayAs: prop.displayAs ?? "",
            appliesTo: undefined,
        }])),
    }
    return refCache;
}