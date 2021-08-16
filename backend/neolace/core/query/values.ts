import {
    C,
    CypherQuery,
    Field,
    VNID,
    WrappedTransaction,
} from "neolace/deps/vertex-framework.ts";

import { QueryContext } from "./context.ts";
import { QueryEvaluationError } from "./errors.ts";

// Query language string > expression tree > abstract value > concrete value


export abstract class QueryValue {
    public static readonly isAbstract: boolean;
}

/**
 * A value that respresents some concrete data, like the number 5 or a list of entries.
 */
abstract class ConcreteValue extends QueryValue {
    static readonly isAbstract = false;
}

/**
 * A value that respresents something abstract like "All Image Entries", and which
 * needs to be 
 */
abstract class AbstractValue extends QueryValue {
    static readonly isAbstract = true;

    public abstract getValueFor(context: {tx: WrappedTransaction, siteId: VNID, entryId?: VNID}): Promise<ConcreteValue>;
}

interface ICountableValue {
    hasCount: true;
    getCount(context: QueryContext): Promise<bigint>;
}


/**
 * A value that respresents an integer (BigInt)
 */
export class IntegerValue extends ConcreteValue {
    readonly value: bigint;

    constructor(value: bigint|number) {
        super();
        this.value = BigInt(value);
    }
}

/**
 * Represents an Entry
 */
export class EntryValue extends ConcreteValue {
    readonly id: VNID;

    constructor(id: VNID) {
        super();
        this.id = id;
    }
}
/**
 * Represents an Entry, annotated with some extra information (like "distance" from another entry)
 */
export class AnnotatedEntryValue extends EntryValue {
    readonly annotations: Readonly<Record<string, ConcreteValue>>;

    constructor(id: VNID, annotations: Record<string, ConcreteValue>) {
        super(id);
        this.annotations = annotations;
    }
}

/**
 * A subset of values from a larger value set.
 */
export class PageValue<T extends ConcreteValue> extends ConcreteValue {
    readonly values: T[];
    readonly startedAt: bigint;  // Also called "skip"
    readonly pageSize: bigint;  // Also called "limit"
    readonly totalCount: bigint;

    constructor(values: T[], {startedAt, pageSize, totalCount}: {startedAt: bigint, pageSize: bigint, totalCount: bigint}) {
        super();
        this.values = values;
        this.startedAt = startedAt;
        this.pageSize = pageSize;
        this.totalCount = totalCount;
    }
}

type AnnotationReviver = (annotatedValue: unknown) => ConcreteValue;

/**
 * An abstract value that represents a set of entries.
 * 
 * e.g. "All image entries", or "entries with ID A, B, or C"
 * 
 * Entries can be "annotated" with additional data, such as the distance between it and the current entry
 */
export class EntrySetValue extends AbstractValue implements ICountableValue {
    readonly hasCount = true;
    readonly query: CypherQuery;
    /**
     * Many entry queries are designed to be evaluated in the context of a specific entry,
     * e.g. a query for "All image entries related to (THIS ENTRY)". If this is such a query,
     * it can only be evaluated if an entry ID is provided.
     */
    readonly requiresEntryId: boolean;
    readonly annotations: Readonly<Record<string, AnnotationReviver>>|undefined;

    constructor(query: CypherQuery, options: {requiresEntryId?: boolean, annotations?: Record<string, AnnotationReviver>} = {}) {
        super();
        this.query = query;
        this.requiresEntryId = options.requiresEntryId ?? false;
        this.annotations = options.annotations;
    }

    private getBaseQuery(context: QueryContext) {
        const params: {siteId: VNID, entryId?: VNID} = {siteId: context.siteId};
        if (this.requiresEntryId) {
            if (!context.entryId) {
                throw new QueryEvaluationError("This expression can only be evaluated in the context of a specific entry.");
            }
            params.entryId = context.entryId;
        }
        return this.query.withParams(params);
    }

    public async getValueFor(context: QueryContext): Promise<PageValue<EntryValue>> {
        const skip = 0n;
        const limit = 100n;
        const query = C`
            ${this.getBaseQuery(context)}
            RETURN entry.id, annotations
            SKIP ${C(String(skip))} LIMIT ${C(String(limit))}
        `.givesShape({"entry.id": Field.VNID, annotations: Field.Any});
        const result = await context.tx.query(query);
        const totalCount = skip === 0n && result.length < limit ? BigInt(result.length) : await this.getCount(context);
        return new PageValue<EntryValue>(
            result.map(r => {
                if (this.annotations) {
                    const annotatedValues: Record<string, ConcreteValue> = {};
                    for (const key in this.annotations) {
                        annotatedValues[key] = this.annotations[key](r.annotations[key]);
                    }
                    return new AnnotatedEntryValue(r["entry.id"], annotatedValues);
                } else {
                    return new EntryValue(r["entry.id"])
                }
            }),
            {
                startedAt: skip,
                pageSize: limit,
                totalCount,
            },
        );
    }

    public async getCount(context: QueryContext): Promise<bigint> {
        const countQuery = this.getBaseQuery(context).RETURN({"count(*)": Field.BigInt});
        const result = await context.tx.query(countQuery);
        return result[0]["count(*)"];
    }
}
