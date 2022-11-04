// deno-lint-ignore-file no-explicit-any
import { vnidString, } from "../api-schemas.ts";
import { Schema, SchemaValidatorFunction, string } from "../deps/computed-types.ts";
import { Edit, EditChangeType, EditType } from "./Edit.ts";

/**
 * A "Bulk Edit" is a special type of content edit that is designed to efficiently updated many entries/property facts
 * at once. Bulk edits are more limited than content edits, because most of their logic is implemented within the Neo4j
 * graph database, in order to allow efficient upserts of many entries.
 *
 * Bulk edits will have no effect if they try to create entries that already exist or set property facts that already
 * have the same value, etc.
 *
 * Bulk edits that DO have an effect (e.g. that create or update entries) will be saved into the AppliedEdit history as
 * if they were made using the equivalent ContentEdits (CreateEntry, UpdatePropertyFact, etc.). This way, analyzing the
 * edit history of specific entries is simpler as only ContentEdits need to be considered. (For example, all entry
 * creation will show up in the history as a "CreateEntry" event, not as either "CreateEntry" or "UpsertById" or
 * "UpsertByFriendlyId")
 */
export interface BulkEditType<Code extends string = string, DataSchema extends SchemaValidatorFunction<any> = any> extends EditType<Code, DataSchema> {
    changeType: EditChangeType.Bulk;
    isBulkEdit: true,
}

// This helper function just makes the typing easier to set.
function BulkEditType<Code extends string, DataSchema extends SchemaValidatorFunction<any>>(args: BulkEditType<Code, DataSchema>): BulkEditType<Code, DataSchema> {
    return args;
}

/** Different ways to specify an entry */
// const BulkEditEntryLookup = Schema.either(
//     /** Look up an entry based on its ID: */
//     Schema({entryId: vnidString}),
//     /** Look up an entry based on its friendly ID: */
//     Schema({friendlyId: string}),
//     /** Look up an entry based on a property value: */
//     Schema({entryTypeId: vnidString, propertyId: vnidString, exactValueExpression: string}),
// );

export const UpsertEntryById = BulkEditType({
    changeType: EditChangeType.Bulk,
    code: "UpsertEntryById",
    dataSchema: Schema({
        where: Schema({
            entryTypeId: vnidString,
            entryId: vnidString,
        }),
        // If the entry doesn't yet exist, create it and set the following fields. If it does exist, ignore
        // these fields.
        setOnCreate: Schema({
            name: string.strictOptional(),
            description: string.strictOptional(),
            friendlyId: string.strictOptional(),
        }).strictOptional(),
        // In any case, set these fields:
        set: Schema({
            name: string.strictOptional(),
            description: string.strictOptional(),
            friendlyId: string.strictOptional(),
        }).strictOptional(),
    }),
    isBulkEdit: true,
    describe: (_data) => `Bulk Updated Entries`,
});

export const UpsertEntryByFriendlyId = BulkEditType({
    changeType: EditChangeType.Bulk,
    code: "UpsertEntryById",
    dataSchema: Schema({
        where: Schema({
            entryTypeId: vnidString,
            friendlyId: string,
        }),
        // If the entry doesn't yet exist, create it and set the following fields. If it does exist, ignore
        // these fields.
        setOnCreate: Schema({
            name: string.strictOptional(),
            description: string.strictOptional(),
        }).strictOptional(),
        // In any case, set these fields:
        set: Schema({
            name: string.strictOptional(),
            description: string.strictOptional(),
        }).strictOptional(),
    }),
    isBulkEdit: true,
    describe: (_data) => `Bulk Updated Entries`,
});

export const _allBulkEditTypes = {
    UpsertEntryById,
    UpsertEntryByFriendlyId,
};

export type AnyBulkEdit = (
    | Edit<typeof UpsertEntryById>
    | Edit<typeof UpsertEntryByFriendlyId>
);
