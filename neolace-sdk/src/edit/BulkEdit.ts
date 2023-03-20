// deno-lint-ignore-file no-explicit-any
import { vnidString } from "../api-schemas.ts";
import { array, Schema, SchemaValidatorFunction, string } from "../deps/computed-types.ts";
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
 * "UpsertByKey")
 */
export interface BulkEditType<Code extends string = string, DataSchema extends SchemaValidatorFunction<any> = any>
    extends EditType<Code, DataSchema> {
    changeType: EditChangeType.Bulk;
}

// This helper function just makes the typing easier to set.
function BulkEditType<Code extends string, DataSchema extends SchemaValidatorFunction<any>>(
    args: BulkEditType<Code, DataSchema>,
): BulkEditType<Code, DataSchema> {
    return args;
}

/** Different ways to specify an entry */
const BulkEditEntryLookup = Schema.either(
    /** Look up an entry based on its ID: */
    Schema({ entryId: vnidString }),
    /** Look up an entry based on its key: */
    Schema({ entryKey: string }),
    /** Look up an entry based on a property value: */
    // Schema({entryTypeKey: vnidString, propertyId: vnidString, exactValueExpression: string}),
);

export const UpsertEntryById = BulkEditType({
    changeType: EditChangeType.Bulk,
    code: "UpsertEntryById",
    dataSchema: Schema({
        where: Schema({
            entryTypeKey: string,
            entryId: vnidString,
        }),
        // If the entry doesn't yet exist, create it and set the following fields. If it does exist, ignore
        // these fields.
        setOnCreate: Schema({
            name: string.strictOptional(),
            description: string.strictOptional(),
            key: string.strictOptional(),
        }).strictOptional(),
        // In any case, set these fields:
        set: Schema({
            name: string.strictOptional(),
            description: string.strictOptional(),
            key: string.strictOptional(),
        }).strictOptional(),
    }),
    describe: (_data) => `Bulk Updated Entries`,
});

export const UpsertEntryByKey = BulkEditType({
    changeType: EditChangeType.Bulk,
    code: "UpsertEntryByKey",
    dataSchema: Schema({
        where: Schema({
            entryTypeKey: string,
            entryKey: string,
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
    describe: (_data) => `Bulk Updated Entries`,
});

export const SetPropertyFacts = BulkEditType({
    changeType: EditChangeType.Bulk,
    code: "SetPropertyFacts",
    dataSchema: Schema({
        entryWith: BulkEditEntryLookup,
        set: array.of(Schema({
            propertyKey: string,
            facts: array.of(Schema({
                valueExpression: string,
                note: string.strictOptional(),
                slot: string.strictOptional(),
            })),
        })),
    }),
    describe: (_data) => `Bulk Updated Entries`,
});

export const SetRelationships = BulkEditType({
    changeType: EditChangeType.Bulk,
    code: "SetRelationships",
    dataSchema: Schema({
        entryWith: BulkEditEntryLookup,
        set: array.of(Schema({
            propertyKey: string,
            toEntries: array.of(Schema({
                entryWith: BulkEditEntryLookup,
                note: string.strictOptional(),
                slot: string.strictOptional(),
            })),
        })),
    }),
    describe: (_data) => `Bulk Updated Entries`,
});

export const _allBulkEditTypes = {
    UpsertEntryById,
    UpsertEntryByKey,
    SetPropertyFacts,
    SetRelationships,
};

export type AnyBulkEdit =
    | Edit<typeof UpsertEntryById>
    | Edit<typeof UpsertEntryByKey>
    | Edit<typeof SetPropertyFacts>
    | Edit<typeof SetRelationships>;

export const BulkEditSchema = Schema.either(
    Schema({ code: UpsertEntryById.code, data: UpsertEntryById.dataSchema }),
    Schema({ code: UpsertEntryByKey.code, data: UpsertEntryByKey.dataSchema }),
    Schema({ code: SetPropertyFacts.code, data: SetPropertyFacts.dataSchema }),
    Schema({ code: SetRelationships.code, data: SetRelationships.dataSchema }),
).transform((e) => e as AnyBulkEdit);
