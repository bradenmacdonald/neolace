import { Schema, Type, string, vnidString, nullable, array, number, object, Record, boolean } from "../api-schemas.ts";
import { AnyLookupValue } from "./lookup-value.ts";


export enum GetEntryFlags {
    IncludeAncestors = "ancestors",
    IncludePropertiesSummary = "propertiesSummary",
    IncludeReferenceCache = "referenceCache",
    /**
     * Include special "features" of this entry, like the article text, the contained image, or the ability to use it
     * as a property for other entries.
     */
    IncludeFeatures = "features",
}


/**
 * Defines the information needed to display a property value in the frontend
 */
export const DisplayedPropertySchema = Schema.merge(
    // common fields:
    {
        /** The ID of this SimplePropertyValue or the ID of the property entry */
        id: vnidString,
        label: string,
        value: object.transform(obj => obj as AnyLookupValue),
        importance: number,
        /** Markdown text with an explanation of this property */
        note: string.strictOptional(),
    },
    Schema.either(
        {
            type: "SimplePropertyValue" as const,
            // Source: SimplePropertyValues are never inherited and can only come from the entry type. In future they may come from the Entry too.
            source: Schema({ from: "EntryType" as const }),
        },
        {
            type: "PropertyValue" as const,
            /**
             * Source: where this property value comes from. May be inherited from another Entry, or from the EntryType
             * This will be absent if the property is attached "directly" to the current entry.
             */
            source: Schema.either(
                {from: "ThisEntry" as const},
                {from: "AncestorEntry" as const, entryId: vnidString},
            ),
        },
    ),
);
export type DisplayedPropertyData = Type<typeof DisplayedPropertySchema>;


export const EntryFeaturesSchema = Schema({
    Image: Schema({
        imageUrl: string,
        contentType: string,
        size: number,
    }).strictOptional(),

    HeroImage: Schema({
        entryId: vnidString,
        imageUrl: string,
        caption: string,
    }).strictOptional(),

    UseAsProperty: Schema({
        importance: number,
        inherits: boolean,
        displayAs: nullable(string),
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

    /** All ancestors (IS_A relationships) of this entry (limited to 100 total / 50 levels deep) */
    ancestors: array.of(Schema({
        id: vnidString,
        name: string,
        friendlyId: string,
        entryType: Schema({id: vnidString}),
        distance: number,
    })).strictOptional(),

    features: EntryFeaturesSchema.strictOptional(),

    featuredImage: Schema({
        entryId: vnidString,
        /** Markdown caption for this featured image */
        note: string.strictOptional(),
    }).strictOptional(),
});
export type EntryData = Type<typeof EntrySchema>;
