import { object } from "../api-schemas.ts";
import { VNID } from "../types.ts";
import { ImageSizingMode } from "./Entry.ts";

/** A "lookup value" / query result / computed fact that has been serialized to JSON */
export interface LookupValue {
    type: string;
    annotations?: Record<string, AnyLookupValue>
}

export interface PageValue extends LookupValue {
    type: "Page";
    values: AnyLookupValue[];
    startedAt: number;
    pageSize: number;
    totalCount: number;
    source?: {expr: string; entryId?: VNID; };
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
    id: VNID;
}

/** Represents a property like "Date of Birth", not a specific property value. */
export interface PropertyValue extends LookupValue {
    type: "Property";
    id: VNID;
}

export enum ImageDisplayFormat {
    Thumbnail = "thumb",
    RightAligned = "right",
    PlainLogo = "plain",
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
        entryType: VNID;
        isFocusEntry?: boolean;
    }[],
    rels: {
        relId: VNID;
        relType: VNID;
        fromEntryId: VNID;
        toEntryId: VNID;
    }[],
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
    link?: EntryValue|StringValue;
    // How the image should be displayed:
    format: ImageDisplayFormat;
    caption?: InlineMarkdownString|StringValue;
    maxWidth?: number;  // maximum width in pixels (CSS reference pixel at 96dpi), for "logo" format only
    sizing: ImageSizingMode,
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

export interface DateValue extends LookupValue {
    type: "Date";
    /** ISO 8601 date string (no time information) */
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

export interface ErrorValue extends LookupValue {
    type: "Error";
    errorClass: string;
    message: string;
}

export type AnyLookupValue = (
    | PageValue
    | EntryValue
    | EntryTypeValue
    | FileValue
    | PropertyValue
    | GraphValue
    | ImageValue
    | BooleanValue
    | IntegerValue
    | DateValue
    | StringValue
    | InlineMarkdownString
    | NullValue
    | ErrorValue
);

export const LookupValueSchema = object.transform(v => v as AnyLookupValue);
