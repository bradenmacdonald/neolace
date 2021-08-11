import { Schema, Type, string, vnidString, nullable, array, number } from "../api-schemas.ts";
import { ContentType } from "../schema/SiteSchemaData.ts";

export enum GetEntryFlags {
    IncludeAncestors = "ancestors",
}

export const EntrySchema = Schema({
    id: vnidString,
    name: string,
    description: nullable(string),
    friendlyId: string,
    type: Schema({
        id: vnidString,
        name: string,
        contentType: Schema.enum(ContentType),
    }),

    // TODO: content


    /** All ancestors (IS_A relationships) of this entry (limited to 100 total / 50 levels deep) */
    ancestors: array.of(Schema({
        id: vnidString,
        name: string,
        friendlyId: string,
        distance: number,
    })).strictOptional(),

});
export type EntryData = Type<typeof EntrySchema>;
