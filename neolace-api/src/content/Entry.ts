import { Schema, Type, string, vnidString, nullable, array, number, object, Record } from "../api-schemas.ts";
import { AnyLookupValue } from "./lookup-value.ts";


export enum GetEntryFlags {
    IncludePropertiesSummary = "propertiesSummary",
    IncludeReferenceCache = "referenceCache",
    /**
     * Include special "features" of this entry, like the article text or the contained image.
     */
    IncludeFeatures = "features",
}


/**
 * Defines the information needed to display a property value in the frontend
 */
export const DisplayedPropertySchema = Schema({
    propertyId: vnidString,
    label: string,
    value: object.transform(obj => obj as AnyLookupValue),
    importance: number,
    /** Markdown text with an explanation of this property */
    note: string.strictOptional(),
    source: Schema.either(
        {from: "Default" as const},
        {from: "ThisEntry" as const},
        {from: "AncestorEntry" as const, entryId: vnidString},
    ),
});
export type DisplayedPropertyData = Type<typeof DisplayedPropertySchema>;


export const EntryFeaturesSchema = Schema({
    Article: Schema({
        articleMD: string,
        headings: array.of(Schema({title: string, id: string})),
    }).strictOptional(),

    Image: Schema({
        imageUrl: string,
        contentType: string,
        size: number,
        width: number.strictOptional(),
        height: number.strictOptional(),
        blurHash: string.strictOptional(),
    }).strictOptional(),

    HeroImage: Schema({
        entryId: vnidString,
        imageUrl: string,
        caption: string,
        width: number.strictOptional(),
        height: number.strictOptional(),
        blurHash: string.strictOptional(),
    }).strictOptional(),
});
export type EntryFeaturesData = Type<typeof EntryFeaturesSchema>;


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

export type ReferenceCacheData = Type<typeof ReferenceCacheSchema>;
export type RefCacheEntryTypeData = ReferenceCacheData["entryTypes"]["key"];
export type RefCacheEntryData = ReferenceCacheData["entries"]["key"];


export const EntrySchema = Schema({
    id: vnidString,
    name: string,
    description: nullable(string),
    friendlyId: string,
    entryType: Schema({
        id: vnidString,
        name: string,
    }),

    /** Summary of properties for this entry (up to 20 properties, with importance < 20) */
    propertiesSummary: array.of(DisplayedPropertySchema).strictOptional(),

    /** Some details about all entries mentioned by this entry */
    referenceCache: ReferenceCacheSchema.strictOptional(),

    features: EntryFeaturesSchema.strictOptional(),

    featuredImage: Schema({
        entryId: vnidString,
        /** Markdown caption for this featured image */
        note: string.strictOptional(),
    }).strictOptional(),
});
export type EntryData = Type<typeof EntrySchema>;
