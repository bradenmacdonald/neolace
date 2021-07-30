import { Schema, Type, string, vnidString, nullable, array, number } from "../api-schemas.ts";
import { ContentType } from "../schema/SiteSchemaData.ts";

export enum GetEntryFlags {
    IncludeRelationshipFacts = "relationshipFacts",
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

    /** Any relationships from this entry or its ancestor entries */
    relationshipFacts: array.of(Schema({
        entry: Schema({id: vnidString, name: string, friendlyId: string}),
        distance: number,
        relProps: Schema({
            id: vnidString,
            weight: nullable(number),
            // slot: string.strictOptional(),
            // quantity: number.strictOptional(),
        }),
        toEntry: Schema({id: vnidString, name: string, friendlyId: string}),
        relType: Schema({id: vnidString}),
    })).strictOptional(),
});
export type EntryData = Type<typeof EntrySchema>;
