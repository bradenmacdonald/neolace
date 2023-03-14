import { object } from "../api-schemas.ts";
import { VNID } from "../types.ts";
import { ImageSizingMode } from "./Entry.ts";

/** A "lookup value" / query result / computed fact that has been serialized to JSON */
export interface LookupValue {
    type: string;
    annotations?: Record<string, AnyLookupValue>;
}

export interface PageValue extends LookupValue {
    type: "Page";
    values: AnyLookupValue[];
    startedAt: number;
    pageSize: number;
    totalCount: number;
    source?: { expr: string; entryId?: VNID };
}

export interface ListValue extends LookupValue {
    type: "List";
    values: AnyLookupValue[];
}

export interface EntryValue extends LookupValue {
    type: "Entry";
    id: VNID;
}

export interface EntryTypeValue extends LookupValue {
    type: "EntryType";
    key: string;
}

/** Represents a property like "Date of Birth", not a specific property value. */
export interface PropertyValue extends LookupValue {
    type: "Property";
    key: string;
}

export enum ImageDisplayFormat {
    /** The image is shown at its normal/natural size, or resized to fit the width of the page, whichever is smaller */
    Normal = "normal",
    /** The image is shown as a small thumbnail, and users need to click on it to see it. */
    Thumbnail = "thumb",
    /** The image floats to the right, at a medium-size. */
    RightAligned = "right",
    PlainLogo = "logo",
}

/** A file attached to an entry */
export interface FileValue extends LookupValue {
    type: "File";
    filename: string;
    url: string;
    contentType: string;
    size: number;
}

export interface GraphValue extends LookupValue {
    type: "Graph";
    entries: {
        entryId: VNID;
        name: string;
        entryTypeKey: string;
        isFocusEntry?: boolean;
    }[];
    rels: {
        relId: VNID;
        relTypeKey: string;
        fromEntryId: VNID;
        toEntryId: VNID;
    }[];
    /**
     * Information about entries which are NOT in the current set of graphed entries but which are linked to them.
     * These are relationships that the user may wish to "expand" to load more nodes into the graph.
     */
    borderingRelationships: {
        /**
         * For this entry in the graph, there are some connected entries that are NOT in the graph (the "bordering"
         * entries, which the user may wish to add to the graph.)
         */
        entryId: VNID,
        /**
         * If this is an "outbound" relationship, it's a normal relationship FROM entryId to other entries.
         * If this is false, it's a reverse relationship - from various other entries TO entryId.
         */
        isOutbound: boolean,
        /** ID of the property that defines this relationship type. */
        relTypeKey: string,
        /** How many entries are related to entryId via this relationship. */
        entryCount: number,
    }[];
}

export interface ImageValue extends LookupValue {
    type: "Image";
    entryId: VNID;
    imageUrl: string;
    contentType: string;
    altText: string;
    size: number;
    width?: number;
    height?: number;
    blurHash?: string;
    borderColor?: [R: number, G: number, B: number, A: number];
    // Should this image be a link?
    link?: EntryValue | StringValue;
    // How the image should be displayed:
    format: ImageDisplayFormat;
    caption?: InlineMarkdownString | StringValue;
    maxWidth?: number; // maximum width in pixels (CSS reference pixel at 96dpi), for "logo" format only
    sizing: ImageSizingMode;
}

export interface BooleanValue extends LookupValue {
    type: "Boolean";
    value: boolean;
}

export interface IntegerValue extends LookupValue {
    type: "Integer";
    /** Yes, Integer values are serialized as strings because internally they are BigInt, which doesn't serialize to JSON */
    value: string;
}

export interface QuantityValue extends LookupValue {
    type: "Quantity";
    magnitude: number;
    units?: string;
    /** Helpful conversions that users may wish to see */
    conversions?: {
        /** The most important/expected conversion to display, if relevant */
        primary?: { magnitude: number; units: string };
        /** Conversion to base SI units, if not already in base units */
        base?: { magnitude: number; units: string };
        /** Conversion to US Customary System */
        uscs?: { magnitude: number; units: string };
    };
}

export interface RangeValue extends LookupValue {
    type: "Range";
    min: IntegerValue | QuantityValue | DateValue | StringValue;
    max: IntegerValue | QuantityValue | DateValue | StringValue;
}

export interface DateValue extends LookupValue {
    type: "Date";
    /** ISO 8601 date string (no time information) */
    value: string;
}

export interface DatePartialValue extends LookupValue {
    type: "DatePartial";
    year: number|undefined;
    month: number|undefined;
    day: number|undefined;
    /** ISO 8601 date string (YYYY, YYYY-MM, --MM, --MM-DD) */
    value: string;
}

export interface StringValue extends LookupValue {
    type: "String";
    value: string;
}

export interface InlineMarkdownString extends LookupValue {
    type: "InlineMarkdownString";
    value: string;
}

export interface NullValue extends LookupValue {
    type: "Null";
}

export interface PluginValue extends LookupValue {
    type: "PluginValue";
    plugin: string;
    value: unknown;
}

export interface ErrorValue extends LookupValue {
    type: "Error";
    errorClass: string;
    message: string;
}

export type AnyLookupValue =
    | PageValue
    | EntryValue
    | EntryTypeValue
    | FileValue
    | PropertyValue
    | GraphValue
    | ImageValue
    | BooleanValue
    | IntegerValue
    | QuantityValue
    | RangeValue
    | DateValue
    | DatePartialValue
    | StringValue
    | InlineMarkdownString
    | NullValue
    | PluginValue
    | ErrorValue;

export const LookupValueSchema = object.transform((v) => v as AnyLookupValue);
