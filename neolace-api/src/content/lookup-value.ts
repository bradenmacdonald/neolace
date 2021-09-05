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


export interface EntryValue extends LookupValue {
    type: "Entry";
    id: VNID;
}

export interface AnnotatedEntryValue extends LookupValue {
    type: "AnnotatedEntry";
    id: VNID;
    annotations: Record<string, AnyLookupValue>;
}

export interface IntegerValue extends LookupValue {
    type: "Integer";
    /** Yes, Integer values are serialized as strings because internally they are BigInt, which doesn't serialize to JSON */
    value: string;
}

export type AnyLookupValue = (
    | PageValue
    | EntryValue
    | AnnotatedEntryValue
    | IntegerValue
);
