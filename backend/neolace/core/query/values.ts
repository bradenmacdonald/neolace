import {
    C,
    CypherQuery,
    Field,
    VNID,
} from "neolace/deps/vertex-framework.ts";
import { Entry } from "neolace/core/entry/Entry.ts";

import { QueryContext } from "./context.ts";
import { QueryError, QueryEvaluationError } from "./errors.ts";

// deno-lint-ignore no-explicit-any
type ClassOf<QV extends QueryValue> = {new(...args: any[]): QV};

export abstract class QueryValue {
    public static readonly isLazy: boolean;

    /** Convert this value to a different value type if possible, or otherwise return undefined */
    public castTo<NewType extends QueryValue>(newType: ClassOf<NewType>, context: QueryContext): NewType|undefined {
        const newValue = this.doCastTo(newType, context);
        if (newValue) {
            if (!(newValue instanceof newType)) {
                throw new QueryEvaluationError(`Internal error, cast from ${this.constructor.name} to ${newType.name} failed.`);
            }
        }
        return newValue;
    }

    /** Subclasses should override this method to implement type casting. */
    protected doCastTo(_newType: ClassOf<QueryValue>, _context: QueryContext): QueryValue|undefined {
        return undefined;
    }

    /** If this is a LazyValue, convert it to a default non-lazy value. */
    public abstract makeConcrete(): Promise<ConcreteValue>;
}

/**
 * A value that respresents some concrete data, like the number 5 or a list of entries.
 */
export abstract class ConcreteValue extends QueryValue {
    static readonly isLazy = false;

    /** Return fields other than 'type' to be included in this value when serialized as a JSON object. */
    protected abstract serialize(): Record<string, unknown>;
    public toJSON() {
        if (!this.constructor.name.endsWith("Value")) { throw new Error("Invalid value class name"); }
        return {
            // "type" is the name of the ____Value class without the "Value" part
            type: this.constructor.name.substr(0, this.constructor.name.length - 5),
            ...this.serialize(),
        };
    }

    public makeConcrete(): Promise<ConcreteValue> { return new Promise(resolve => resolve(this)); }
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

    protected serialize() {
        // Unfortunately JavaScript cannot serialize BigInt to JSON numbers (even though JSON numbers can have
        // arbitrary digits), so we have to serialize it as a string.
        return {value: String(this.value)};
    }
}

/**
 * A null value
 */
export class NullValue extends ConcreteValue {
    /**
     * Return this value as a string, in Neolace Query Language format.
     * This string should parse to an expression that yields the same value.
     */
    public asLiteral(): string {
        return "null";
    }

    protected serialize() { return {}; }
}

/**
 * An error value - represents an error.
 * 
 * Evaluating expressions will always throw an exception, not return an error value. However, in some use cases it makes
 * sense to catch those exceptions and convert them to error values, so that a value is always returned.
 */
export class ErrorValue extends ConcreteValue {
    public readonly error: QueryError;

    constructor(error: QueryError) {
        super();
        this.error = error;
    }

    protected serialize() { return {errorClass: this.error.constructor.name, message: this.error.message}; }
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

    /**
     * Return this value as a string, in Neolace Query Language format.
     * This string should parse to an expression that yields the same value.
     */
    public asLiteral(): string {
        return `E[${this.id}]`;  // e.g. E[_6FisU5zxXggLcDz4Kb3Wmd]
    }

    protected override doCastTo(newType: ClassOf<QueryValue>, context: QueryContext): QueryValue|undefined {
        if (newType === LazyEntrySetValue) {
            return new LazyEntrySetValue(context, C`
                MATCH (entry:${Entry} {id: ${this.id}})
                WITH entry, {} AS annotations
            `);
        }
        return undefined;
    }

    protected serialize() { return {id: this.id}; }
}

/**
 * Represents an EntryType
 */
export class EntryTypeValue extends ConcreteValue {
    readonly id: VNID;

    constructor(id: VNID) {
        super();
        this.id = id;
    }

    /**
     * Return this value as a string, in Neolace Query Language format.
     * This string should parse to an expression that yields the same value.
     */
    public asLiteral(): string {
        return `ET[${this.id}]`;  // e.g. ET[_6FisU5zxXggLcDz4Kb3Wmd]
    }

    protected serialize() { return {id: this.id}; }
}

/**
 * Represents a RelationshipType
 */
export class RelationshipTypeValue extends ConcreteValue {
    readonly id: VNID;

    constructor(id: VNID) {
        super();
        this.id = id;
    }

    /**
     * Return this value as a string, in Neolace Query Language format.
     * This string should parse to an expression that yields the same value.
     */
    public asLiteral(): string {
        return `RT[${this.id}]`;  // e.g. RT[_6FisU5zxXggLcDz4Kb3Wmd]
    }

    protected serialize() { return {id: this.id}; }
}

/**
 * Represents a RelationshipFact
 */
export class RelationshipFactValue extends ConcreteValue {
    readonly id: VNID;

    constructor(id: VNID) {
        super();
        this.id = id;
    }

    /**
     * Return this value as a string, in Neolace Query Language format.
     * This string should parse to an expression that yields the same value.
     */
    public asLiteral(): string {
        return `RF[${this.id}]`;  // e.g. RF[_6FisU5zxXggLcDz4Kb3Wmd]
    }

    protected serialize() { return {id: this.id}; }
}

/**
 * Represents an Entry, annotated with some extra information (like "distance" from another entry)
 */
export class AnnotatedEntryValue extends EntryValue {
    readonly annotations: Readonly<Record<string, ConcreteValue>>;

    constructor(id: VNID, annotations: Record<string, ConcreteValue>) {
        super(id);
        this.annotations = annotations;
        if (Object.keys(annotations).length === 0) {throw new Error(`Missing annotations`);}
    }

    protected serialize() {
        const annotations: Record<string, unknown> = {};
        for (const key in this.annotations) {
            annotations[key] = this.annotations[key].toJSON();
        }
        return {id: this.id, annotations}; 
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

    protected serialize() {
        return {
            values: this.values.map(v => v.toJSON()),
            startedAt: Number(this.startedAt),
            pageSize: Number(this.pageSize),
            totalCount: Number(this.totalCount),
        };
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
