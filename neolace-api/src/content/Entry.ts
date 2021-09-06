import { Schema, Type, string, vnidString, nullable, array, number, object, Record } from "../api-schemas.ts";
import { ContentType } from "../schema/SiteSchemaData.ts";
import { AnyLookupValue } from "./lookup-value.ts";


export enum GetEntryFlags {
    IncludeAncestors = "ancestors",
    IncludeComputedFactsSummary = "computedFactsSummary",
    IncludeReferenceCache = "referenceCache",
}

// The "reference cache" contains details (name, friendlyId, entry type) for every entry mentioned in the entry's
// description, article text, computed facts, related object notes, and so on.
export const ReferenceCacheSchema = Schema({
    // We can't use the VNID type as Record keys unfortunately, but the keys here are VNIDs
    entryTypes: Record(string, Schema({
        id: vnidString,
        name: string,
    })),
    entries: Record(string, Schema({
        id: vnidString,
        name: string,
        friendlyId: string,
        description: string,
        entryType: Schema({id: vnidString}),
    })),
});

export const EntrySchema = Schema({
    id: vnidString,
    name: string,
    description: nullable(string),
    friendlyId: string,
    entryType: Schema({
        id: vnidString,
        name: string,
        contentType: Schema.enum(ContentType),
    }),

    // TODO: content

    /** Summary of computed facts for this entry (up to 20 computed facts, with importance < 20) */
    computedFactsSummary: array.of(Schema({
        label: string,
        value: object.transform(obj => obj as AnyLookupValue),
        id: vnidString,
    })).strictOptional(),

    /** Some details about all entries mentioned by this entry */
    referenceCache: ReferenceCacheSchema.strictOptional(),

    /** All ancestors (IS_A relationships) of this entry (limited to 100 total / 50 levels deep) */
    ancestors: array.of(Schema({
        id: vnidString,
        name: string,
        friendlyId: string,
        entryType: Schema({id: vnidString}),
        distance: number,
    })).strictOptional(),

});
export type EntryData = Type<typeof EntrySchema>;
