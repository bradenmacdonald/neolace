import { array, number, Schema, string, Type, vnidString } from "../api-schemas.ts";
import { LookupValueSchema } from "./lookup-value.ts";
import { ReferenceCacheSchema } from "./reference-cache.ts";

export enum GetEntryFlags {
    IncludePropertiesSummary = "propertiesSummary",
    IncludeReferenceCache = "referenceCache",
    /**
     * Include special "features" of this entry, like the article text or the contained image.
     */
    IncludeFeatures = "features",
    /**
     * Include the unevaluated lookup expressions for every property that is directly set on this entry.
     * This is useful for editing or exporting, but not really for viewing the entry.
     */
    IncludeRawProperties = "propertiesRaw",
}

/**
 * Defines the information needed to display a property value in the frontend
 */
export const DisplayedPropertySchema = Schema({
    propertyKey: string,
    value: LookupValueSchema,
});
export type DisplayedPropertyData = Type<typeof DisplayedPropertySchema>;

export const RawPropertySchema = Schema({
    propertyKey: string,
    facts: array.of(Schema({
        id: vnidString,
        valueExpression: string,
        note: string,
        rank: number,
        slot: string,
    })),
});
export type RawPropertyData = Type<typeof RawPropertySchema>;

export enum ImageSizingMode {
    /** The image should never be cropped when scaled to fit in a container */
    Contain = "contain",
    /* When scaling this image to fit in a container, it can be cropped to match the container's aspect ratio */
    Cover = "cover",
}

export const EntryFeaturesSchema = Schema({
    Article: Schema({
        articleContent: string,
        headings: array.of(Schema({ title: string, id: string })),
    }).strictOptional(),

    Files: Schema({
        files: array.of(Schema({
            filename: string,
            url: string,
            contentType: string,
            size: number,
        })),
    }).strictOptional(),

    Image: Schema({
        imageUrl: string,
        contentType: string,
        size: number,
        sizing: Schema.enum(ImageSizingMode),
        width: number.strictOptional(),
        height: number.strictOptional(),
        blurHash: string.strictOptional(),
        /** RGBA array of values from 0-255 */
        borderColor: array.of(number).strictOptional(),
    }).strictOptional(),

    HeroImage: Schema({
        entryId: vnidString,
        imageUrl: string,
        caption: string,
        sizing: Schema.enum(ImageSizingMode),
        width: number.strictOptional(),
        height: number.strictOptional(),
        blurHash: string.strictOptional(),
        /** RGBA array of values from 0-255 */
        borderColor: array.of(number).strictOptional(),
    }).strictOptional(),
});
export type EntryFeaturesData = Type<typeof EntryFeaturesSchema>;

export const BaseEntrySchema = Schema({
    id: vnidString,
    key: string,
    name: string,
    description: string,
    entryType: Schema({
        key: string,
        name: string,
    }),
});
export const EntrySchema = Schema.merge(BaseEntrySchema, {
    /** Summary of properties for this entry (up to 20 properties, with rank < 50) */
    propertiesSummary: array.of(DisplayedPropertySchema).strictOptional(),

    /** Some details about all entries mentioned by this entry */
    referenceCache: ReferenceCacheSchema.strictOptional(),

    features: EntryFeaturesSchema.strictOptional(),

    propertiesRaw: array.of(RawPropertySchema).strictOptional(),
});
export type EntryData = Type<typeof EntrySchema>;
export type EditableEntryData = Type<typeof BaseEntrySchema> & {
    features: NonNullable<EntryData["features"]>;
    propertiesRaw: NonNullable<EntryData["propertiesRaw"]>;
};

export const EntrySummarySchema = Schema({
    id: vnidString,
    key: string,
    entryType: Schema({ key: string }),
    name: string,
});
export type EntrySummaryData = Type<typeof EntrySummarySchema>;
