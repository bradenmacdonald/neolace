import { C, CypherQuery, Field, VNID } from "neolace/deps/vertex-framework.ts";
import type * as api from "neolace/deps/neolace-api.ts";

import type { LookupContext } from "../context.ts";
import type { LookupExpression } from "../expressions/base.ts";
import { LookupEvaluationError } from "../errors.ts";

// This is a cicular import, but it seems to work if we import from ../values.ts instead of directly from
// BooleanValue.ts and PageValue.ts
import { BooleanValue, PageValue } from "../values.ts";

/** Helper function to get the type of the class itself, not the type of instances of the class */
// deno-lint-ignore no-explicit-any
export type ClassOf<QV extends LookupValue> = { new (...args: any[]): QV };

/**
 * A lookup value. Every Lookup _Expression_ evaluates to a Lookup _Value_.
 */
export abstract class LookupValue {
    public static readonly isLazy: boolean;

    /** Convert this value to a different value type if possible, or otherwise return undefined */
    public async castTo<NewType extends LookupValue>(
        newType: ClassOf<NewType>,
        context: LookupContext,
    ): Promise<NewType | undefined> {
        if (this instanceof newType) {
            return this;
        }

        // Special case for casting to bool - any countable value is true unless its count is zero
        // Note: boolean casting logic is tested in 'if.test.ts'
        if ((newType as ClassOf<LookupValue>) === BooleanValue) {
            if (isCountableValue(this)) {
                // deno-lint-ignore no-explicit-any
                return new BooleanValue(await this.getCount() !== 0n) as any;
            }
        }

        // Do the cast, using the subclass's implementation
        const newValue = await this.doCastTo(newType, context);
        if (newValue) {
            if (!(newValue instanceof newType)) {
                throw new LookupEvaluationError(
                    `Internal error, cast from ${this.constructor.name} to ${newType.name} failed.`,
                );
            }
        }

        // A second special case for casting to bool - any value which isn't explicitly falsy is truthy.
        if (newValue === undefined && (newType as ClassOf<LookupValue>) === BooleanValue) {
            // deno-lint-ignore no-explicit-any
            return new BooleanValue(true) as any;
        }

        return newValue;
    }

    /**
     * Return this value as a string, in Neolace Lookup Expression format.
     * This string should parse to an expression that yields the same value.
     *
     * If the value cannot be expressed as a literal, this should return undefined.
     */
    public abstract asLiteral(): string | undefined;

    /**
     * Subclasses should override this method to implement type casting.
     * Casting to bool is generally automatically handled (see castTo() above), so bool casting only needs to be
     * implemented if this value type can be falsy.
     */
    protected doCastTo(
        _newType: ClassOf<LookupValue>,
        _context: LookupContext,
    ): LookupValue | undefined | Promise<LookupValue | undefined> {
        return undefined;
    }

    /** If this is a LazyValue, convert it to a default non-lazy value. */
    public abstract makeConcrete(): Promise<ConcreteValue>;

    /** Get a string representation of this value that can be used to sort it. */
    public abstract getSortString(): string;

    /** Get an attribute of this value, if any, e.g. value.name or value.length */
    public async getAttribute(_attrName: string, _context: LookupContext): Promise<LookupValue | undefined> {
        return undefined;
    }
}

/**
 * A value that respresents some concrete data, like the number 5 or a list of entries.
 */
export abstract class ConcreteValue extends LookupValue {
    static readonly isLazy = false;

    /** Return fields other than 'type' to be included in this value when serialized as a JSON object. */
    protected abstract serialize(): api.AnyLookupValue;
    public toJSON(): api.AnyLookupValue {
        if (!this.constructor.name.endsWith("Value")) throw new Error("Invalid value class name");
        return this.serialize();
    }

    public makeConcrete(): Promise<ConcreteValue> {
        return new Promise((resolve) => resolve(this));
    }
}

/**
 * Value types that can be counted (lists, queries, strings, etc.) should conform to this interface, so they can be used
 * with the standard count() function.
 */
export interface ICountableValue {
    hasCount: true;
    getCount(): Promise<bigint>;
}

export function isCountableValue(value: unknown): value is ICountableValue {
    return value instanceof LookupValue && (value as unknown as ICountableValue).hasCount === true;
}

/**
 * Value types that can be iterated (lists, queries, strings, etc.) should conform to this interface, so they can be used
 * with standard functions like first(), filter(), map(), etc.
 *
 * Use the iterateOver() helper method for an easy way to iterate over all the values, if needed.
 */
export interface IIterableValue {
    isIterable: true;
    /**
     * Get a "slice" containing up to numItems values from this iterator.
     * To get the first item use getSlice(0, 1); for the second item, getSlice(1, 1), etc.
     * When the returned array has length less than numItems, the iterator is exhausted.
     */
    getSlice(offset: bigint, numItems: bigint): Promise<LookupValue[]>;
}

export function isIterableValue(value: unknown): value is LookupValue & IIterableValue {
    return value instanceof LookupValue && (value as unknown as IIterableValue).isIterable === true;
}

/**
 * This iterable has some original expression that generated it, e.g. 'this.ancestors()' could be the source exprsesion
 * of a set of entries.
 */
export interface IHasSourceExpression {
    sourceExpression: LookupExpression | undefined;
    sourceExpressionEntryId: VNID | undefined;
    /** Create a copy of this value, with a different source expression. Used to override source expression. */
    cloneWithSourceExpression(
        sourceExpression: LookupExpression | undefined,
        sourceExpressionEntryId: VNID | undefined,
    ): LookupValue;
}

export function hasSourceExpression(value: unknown): value is LookupValue & IHasSourceExpression {
    return (
        value instanceof LookupValue &&
        (value as unknown as IHasSourceExpression).sourceExpression !== undefined &&
        typeof (value as unknown as IHasSourceExpression).cloneWithSourceExpression === "function"
    );
}

/** Any value that can always be expressed as a simple literal (e.g. an integer "5") should conform to this interface. */
export interface IHasLiteralExpression {
    /**
     * Return this value as a string, in Neolace Lookup Expression format.
     * This string should parse to an expression that yields the same value.
     */
    asLiteral(): string;
}

export function hasLiteralExpression(value: LookupValue): value is LookupValue & IHasLiteralExpression {
    return value instanceof LookupValue && value.asLiteral() !== undefined;
}

/**
 * An intermediate value that represents something like a database query, which we haven't yet evaluated.
 * The query (or whatever the lazy value is) may still be modified before it is evaluated. For example, a lazy entry
 * list might be reduced to simply retrieving the total number of matching entries, before it is evaluated.
 */
export abstract class LazyValue extends LookupValue {
    static readonly isLazy = true;
    protected context: LookupContext;

    constructor(context: LookupContext) {
        super();
        this.context = context;
    }

    public override asLiteral() {
        return undefined; // In general, lazy values don't have literal expressions
    }

    /** If this is a LazyValue, convert it to a default non-lazy value. */
    public override makeConcrete() {
        return this.toDefaultConcreteValue();
    }
    public abstract toDefaultConcreteValue(): Promise<ConcreteValue>;
}

/**
 * A cypher-based lookup / query that has not yet been evaluated. Expressions can wrap this query to control things like
 * pagination, annotations, or retrieve only the total count().
 */
export abstract class AbstractLazyCypherQueryValue extends LazyValue
    implements ICountableValue, IIterableValue, IHasSourceExpression {
    public readonly hasCount = true;
    public readonly isIterable = true;
    private defaultPageSize: bigint;

    constructor(
        context: LookupContext,
        /**
         * The first part of the Cypher query, without a RETURN statement or SKIP, LIMIT, etc.
         */
        public readonly cypherQuery: CypherQuery,
        /** The lookup expression that evaluates to this query */
        public readonly sourceExpression: LookupExpression | undefined,
        /** The entry used for any "this" expressions in the sourceExpression. This could be removed if we could erase "this" expressions. */
        public readonly sourceExpressionEntryId: VNID | undefined,
    ) {
        super(context);
        this.defaultPageSize = context.defaultPageSize;
    }

    public abstract cloneWithSourceExpression(
        sourceExpression: LookupExpression,
        sourceExpressionEntryId: VNID,
    ): AbstractLazyCypherQueryValue;

    protected getSkipLimitClause(skip: bigint, limit: bigint) {
        if (typeof skip !== "bigint" || typeof limit !== "bigint") {
            throw new LookupEvaluationError("Internal error - unsafe skip/limit value.");
        }
        return C`SKIP ${C(String(skip))} LIMIT ${C(String(limit))}`;
    }

    public async getCount(): Promise<bigint> {
        const countQuery = this.cypherQuery.RETURN({ "count(*)": Field.BigInt });
        const result = await this.context.tx.query(countQuery);
        return result[0]["count(*)"];
    }

    public override async toDefaultConcreteValue(): Promise<PageValue<ConcreteValue>> {
        const pageSize = this.defaultPageSize;
        const firstPageValues = await this.getSlice(0n, pageSize);
        const totalCount = firstPageValues.length < pageSize ? BigInt(firstPageValues.length) : await this.getCount();

        const concreteValues = await Promise.all(firstPageValues.map((v) => v.makeConcrete()));

        return new PageValue<ConcreteValue>(concreteValues, {
            startedAt: 0n,
            pageSize,
            totalCount,
            sourceExpression: this.sourceExpression,
            sourceExpressionEntryId: this.sourceExpressionEntryId,
        });
    }

    public abstract getSlice(offset: bigint, numItems: bigint): Promise<LookupValue[]>;
}

/**
 * Allow lookup function code to easily iterate over any iterable like this:
 * for await (const value of iterateOver(iterable)) {
 */
export function iterateOver(iterableValue: LookupValue & IIterableValue): AsyncIterable<LookupValue> {
    return {
        [Symbol.asyncIterator](): AsyncIterator<LookupValue> {
            let currentPage: LookupValue[];
            let numPages = 0n;
            const pageSize = 50;
            let currentIdx = 0;
            return {
                next() {
                    return (async () => {
                        if (currentPage === undefined || currentIdx === pageSize) {
                            // We need to get the next page of values
                            currentPage = await iterableValue.getSlice(BigInt(pageSize) * numPages++, BigInt(pageSize));
                            currentIdx = 0;
                        }
                        const value = currentPage[currentIdx++];
                        return { value, done: value === undefined };
                    })();
                },
            };
        },
    };
}
