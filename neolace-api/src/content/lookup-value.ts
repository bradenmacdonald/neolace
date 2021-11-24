import { VNID } from "../types.ts";

/** A "lookup value" / query result / computed fact that has been serialized to JSON */
export interface LookupValue {
    type: string;
}

export interface PageValue extends LookupValue {
    type: "Page";
    values: AnyLookupValue[];
    startedAt: number;
    pageSize: number;
    totalCount: number;
}

export interface ListValue extends LookupValue {
    type: "List";
    values: AnyLookupValue[];
}

export interface EntryValue extends LookupValue {
    type: "Entry";
    id: VNID;
}

export interface AnnotatedValue extends LookupValue {
    type: "Annotated";
    value: AnyLookupValue;
    annotations: Record<string, AnyLookupValue>;
}

export interface IntegerValue extends LookupValue {
    type: "Integer";
    /** Yes, Integer values are serialized as strings because internally they are BigInt, which doesn't serialize to JSON */
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

export interface ErrorValue extends LookupValue {
    type: "Error";
    errorClass: string;
    message: string;
}

export type AnyLookupValue = (
    | PageValue
    | ListValue
    | EntryValue
    | AnnotatedValue
    | IntegerValue
    | StringValue
    | InlineMarkdownString
    | ErrorValue
);
