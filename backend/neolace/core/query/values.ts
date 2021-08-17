import {
    C,
    CypherQuery,
    Field,
    VNID,
} from "neolace/deps/vertex-framework.ts";

import { QueryContext } from "./context.ts";
import { QueryEvaluationError } from "./errors.ts";

// Query language string > expression tree > lazy value > concrete value


export abstract class QueryValue {
    public static readonly isLazy: boolean;

    /** If this is a LazyValue, convert it to a default non-lazy value. */
    public makeConcrete(): Promise<ConcreteValue> { return new Promise(resolve => resolve(this)); }
}

/**
 * A value that respresents some concrete data, like the number 5 or a list of entries.
 */
export abstract class ConcreteValue extends QueryValue {
    static readonly isLazy = false;
}

/**
 * Value types that can be counted (lists, queries, strings, etc.) should conform to this interface, so they can be used
 * with the standard count() function.
 */
export interface ICountableValue {
    hasCount: true;
    getCount(): Promise<bigint>;
}

/** Any data type that can be expressed as a simple literal (e.g. an integer "5") should conform to this interface. */
export interface IHasLiteralExpression {
    /**
     * Return this value as a string, in Neolace Query Language format.
     * This string should parse to an expression that yields the same value.
     */
    asLiteral(): string;
}
export function hasLiteralExpression(value: unknown): value is QueryValue & IHasLiteralExpression {
    // deno-lint-ignore no-explicit-any
    return value instanceof QueryValue && typeof (value as any).asLiteral === "function";
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

    /**
     * Return this value as a string, in Neolace Query Language format.
     * This string should parse to an expression that yields the same value.
     */
    public asLiteral(): string {
        // An integer literal just looks like a plain integer, e.g. 5
        return String(this.value);
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
 * An intermediate value that represents something like a database query, which we haven't yet evaluated.
 * The query (or whatever the lazy value is) may still be modified before it is evaluated. For example, a lazy entry
 * list might be reduced to simply retrieving the total number of matching entries, before it is evaluated.
 */
abstract class LazyValue extends QueryValue {
    static readonly isLazy = true;
    protected context: QueryContext;

    constructor(context: QueryContext) {
        super();
        this.context = context;
    }

    /** If this is a LazyValue, convert it to a default non-lazy value. */
    public override makeConcrete() { return this.toDefaultConcreteValue(); }
    public abstract toDefaultConcreteValue(): Promise<ConcreteValue>;
}



/**
 * A cypher-based lookup / query that has not yet been evaluated. Expressions can wrap this query to control things like
 * pagination, annotations, or retrieve only the total count().
 */
abstract class LazyCypherQueryValue extends LazyValue implements ICountableValue {
    readonly hasCount = true;
    /**
     * The first part of the Cypher query, without a RETURN statement or SKIP, LIMIT, etc.
     */
    readonly cypherQuery: CypherQuery;
    readonly skip: bigint;  // How many rows to skip when retrieving the result (used for pagination)
    readonly limit: bigint;  // How many rows to return per page

    constructor(context: QueryContext, cypherQuery: CypherQuery, options: {skip?: bigint, limit?: bigint} = {}) {
        super(context);
        this.cypherQuery = cypherQuery;
        this.skip = options.skip ?? 0n;
        this.limit = options.limit ?? 100n;
    }

    /** Helper method for cloning instances of this */
    protected getOptions() {
        return {skip: this.skip, limit: this.limit};
    }

    protected getSkipLimitClause() {
        if (typeof this.skip !== "bigint" || typeof this.limit !== "bigint") {
            throw new QueryEvaluationError("Internal error - unsafe skip/limit value.");
        }
        return C`SKIP ${C(String(this.skip))} LIMIT ${C(String(this.limit))}`;
    }

    public async getCount(): Promise<bigint> {
        const countQuery = this.cypherQuery.RETURN({"count(*)": Field.BigInt});
        const result = await this.context.tx.query(countQuery);
        return result[0]["count(*)"];
    }
}

export class LazyEntrySetValue extends LazyCypherQueryValue {
    readonly annotations: Readonly<Record<string, AnnotationReviver>>|undefined;

    constructor(context: QueryContext, cypherQuery: CypherQuery, options: {skip?: bigint, limit?: bigint, annotations?: Record<string, AnnotationReviver>} = {}) {
        super(context, cypherQuery, options);
        this.annotations = options.annotations;
    }

    public override async toDefaultConcreteValue(): Promise<PageValue<EntryValue>> {
        const query = C`
            ${this.cypherQuery}
            RETURN entry.id, annotations
            ${this.getSkipLimitClause()}
        `.givesShape({"entry.id": Field.VNID, annotations: Field.Any});
        const result = await this.context.tx.query(query);
        const totalCount = this.skip === 0n && result.length < this.limit ? BigInt(result.length) : await this.getCount();

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
                startedAt: this.skip,
                pageSize: this.limit,
                totalCount,
            },
        );
    }
}
