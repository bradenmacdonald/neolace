import { Schema, Type, string, vnidString, array, number, Record } from "../api-schemas.ts";
import { EntryTypeColor, PropertyType } from "../schema/SiteSchemaData.ts";
import { LookupValueSchema } from "./lookup-value.ts";

// The "reference cache" contains details (name, friendlyId, entry type) for every entry mentioned in the entry's
// description, article text, computed facts, related object notes, and so on.
export const ReferenceCacheSchema = Schema({
    // We can't use the VNID type as Record keys unfortunately, but the keys here are VNIDs
    entryTypes: Record(string, Schema({
        id: vnidString,
        name: string,
        color: Schema.enum(EntryTypeColor),
        colorCustom: string.strictOptional(),
        abbreviation: string,
    })),
    entries: Record(string, Schema({
        id: vnidString,
        name: string,
        friendlyId: string,
        description: string,
        entryType: Schema({id: vnidString}),
    })),
    properties: Record(string, Schema({
        id: vnidString,
        name: string,
        description: string,
        type: Schema.enum(PropertyType),
        standardURL: string,
        rank: number,
        displayAs: string,
    })),
    lookups: array.of(Schema({
        entryContext: vnidString.strictOptional(),  // VNID of the entry where the lookup expression was referenced, if applicable.
        lookupExpression: string,  // The lookup expression as parsed by the MDT library in the Neolace API
        value: LookupValueSchema,
    })),
});

export type ReferenceCacheData = Type<typeof ReferenceCacheSchema>;
export type RefCacheEntryTypeData = ReferenceCacheData["entryTypes"]["key"];
export type RefCacheEntryData = ReferenceCacheData["entries"]["key"];
export type RefCachePropertyData = ReferenceCacheData["properties"]["key"];