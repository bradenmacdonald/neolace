import { Schema, Type, string, vnidString, nullable, array, number, unknown } from "../api-schemas.ts";
import { ContentType } from "../schema/SiteSchemaData.ts";

export enum GetEntryFlags {
    IncludeAncestors = "ancestors",
    IncludeComputedFactsSummary = "computedFactsSummary",
}

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
        value: unknown,
        id: vnidString,
    })).strictOptional(),

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
