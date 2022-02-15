import { C, CypherQuery, Field, VNID } from "neolace/deps/vertex-framework.ts";
import * as api from "neolace/deps/neolace-api.ts";
import { Site } from "neolace/core/Site.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";

import type { LookupContext } from "./context.ts";
import { LookupError, LookupEvaluationError } from "./errors.ts";

// deno-lint-ignore no-explicit-any
type ClassOf<QV extends LookupValue> = { new (...args: any[]): QV };

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
}

/**
 * A value that respresents some concrete data, like the number 5 or a list of entries.
 */
export abstract class ConcreteValue extends LookupValue {
    static readonly isLazy = false;

    /** Return fields other than 'type' to be included in this value when serialized as a JSON object. */
    protected abstract serialize(): Omit<api.AnyLookupValue, "type">;
    public toJSON(): api.AnyLookupValue {
        if (!this.constructor.name.endsWith("Value")) throw new Error("Invalid value class name");
        return {
            // "type" is the name of the ____Value class without the "Value" part
            type: this.constructor.name.substr(0, this.constructor.name.length - 5),
            ...this.serialize(),
        } as api.AnyLookupValue;
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

export function isIterableValue(value: unknown): value is (LookupValue & IIterableValue) {
    return value instanceof LookupValue && (value as unknown as IIterableValue).isIterable === true;
}

/** Any value that can always be expressed as a simple literal (e.g. an integer "5") should conform to this interface. */
export interface IHasLiteralExpression {
    /**
     * Return this value as a string, in Neolace Lookup Expression format.
     * This string should parse to an expression that yields the same value.
     */
    asLiteral(): string;
}
export function hasLiteralExpression(value: LookupValue): value is (LookupValue & IHasLiteralExpression) {
    return value instanceof LookupValue && value.asLiteral() !== undefined;
}

/**
 * A value that respresents a boolean
 */
export class BooleanValue extends ConcreteValue {
    readonly value: boolean;

    constructor(value: boolean) {
        super();
        this.value = value;
    }

    /**
     * Return this value as a string, in Neolace Lookup Expression format.
     * This string should parse to an expression that yields the same value.
     */
    public override asLiteral(): string {
        return this.value ? "true" : "false";
    }

    protected serialize() {
        return { value: this.value };
    }
}

/**
 * A value that respresents an integer (BigInt)
 */
export class IntegerValue extends ConcreteValue {
    readonly value: bigint;

    constructor(value: bigint | number) {
        super();
        this.value = BigInt(value);
    }

    /**
     * Return this value as a string, in Neolace Lookup Expression format.
     * This string should parse to an expression that yields the same value.
     */
    public override asLiteral(): string {
        // An integer literal just looks like a plain integer, e.g. 5
        return String(this.value);
    }

    protected serialize() {
        // Unfortunately JavaScript cannot serialize BigInt to JSON numbers (even though JSON numbers can have
        // arbitrary digits), so we have to serialize it as a string.
        return { value: String(this.value) };
    }

    protected override doCastTo(newType: ClassOf<LookupValue>, _context: LookupContext): LookupValue | undefined {
        if (newType === BooleanValue) {
            return new BooleanValue(this.value !== 0n);
        }
        return undefined;
    }
}

/**
 * A value that respresents a calendar date (no time)
 */
export class DateValue extends ConcreteValue {
    readonly year: number;
    readonly month: number;
    readonly day: number;

    constructor(year: bigint | number, month: bigint | number, day: bigint | number) {
        super();
        this.year = Number(year);
        this.month = Number(month);
        this.day = Number(day);
        // Validate:
        let checkDate: Date;
        try {
            checkDate = new Date(this.asIsoString());
        } catch {
            throw new LookupEvaluationError("Invalid date value.");
        }
        if (
            checkDate.getUTCFullYear() !== this.year ||
            checkDate.getUTCMonth() !== this.month - 1 ||
            checkDate.getUTCDate() !== this.day
        ) {
            // This is an invalid date like February 30, which has rolled over into March
            throw new LookupEvaluationError("Invalid date value.");
        }
    }

    /**
     * Return this value as a string, in Neolace Lookup Expression format.
     * This string should parse to an expression that yields the same value.
     */
    public override asLiteral(): string {
        // An integer literal just looks like a plain integer, e.g. 5
        return `date("${this.asIsoString()}")`;
    }

    /** Return this date as a string in ISO 8601 format */
    public asIsoString(): string {
        return `${this.year.toString().padStart(4, "0000")}-${this.month.toString().padStart(2, "0")}-${
            this.day.toString().padStart(2, "0")
        }`;
    }

    protected serialize() {
        return { value: this.asIsoString() };
    }

    protected override doCastTo(newType: ClassOf<LookupValue>, _context: LookupContext): LookupValue | undefined {
        if (newType === BooleanValue) {
            return new BooleanValue(true);
        }
        return undefined;
    }
}

/**
 * A value that respresents a string
 */
export class StringValue extends ConcreteValue implements IHasLiteralExpression, IIterableValue {
    readonly value: string;
    readonly isIterable = true;

    constructor(value: string) {
        super();
        this.value = value;
    }

    /**
     * Return this value as a string, in Neolace Lookup Expression format.
     * This string should parse to an expression that yields the same value.
     */
    public override asLiteral(): string {
        // JSON.stringify() will create a "quoted" and \"escaped\" string for us.
        return JSON.stringify(this.value);
    }

    /**
     * Get a slice of the characters in this string.
     * This does NOT return a substring; it returns an array of single-character strings, because this is part of the
     * iterable interface, not a string-specific function.
     */
    public async getSlice(offset: bigint, numItems: bigint): Promise<LookupValue[]> {
        const slicedStr = this.value.slice(Number(offset), Number(offset + numItems));
        return slicedStr.split("").map((char) => new StringValue(char));
    }

    protected serialize() {
        return { value: this.value };
    }

    protected override doCastTo(newType: ClassOf<LookupValue>, _context: LookupContext): LookupValue | undefined {
        if (newType === BooleanValue) {
            return new BooleanValue(this.value.length !== 0);
        }
        return undefined;
    }
}

/**
 * A value that respresents an inline markdown string
 *
 * Inline means it can only do basic formatting like links or bold/italicized text; it cannot do block elements.
 */
export class InlineMarkdownStringValue extends ConcreteValue implements IHasLiteralExpression {
    readonly value: string;

    constructor(value: string) {
        super();
        this.value = value;
    }

    /**
     * Return this value as a string, in Neolace Lookup Expression format.
     * This string should parse to an expression that yields the same value.
     */
    public override asLiteral(): string {
        // JSON.stringify() will create a "quoted" and \"escaped\" string for us.
        return `markdown(${JSON.stringify(this.value)})`;
    }

    protected serialize() {
        return { value: this.value };
    }

    protected override doCastTo(newType: ClassOf<LookupValue>, _context: LookupContext): LookupValue | undefined {
        if (newType === BooleanValue) {
            return new BooleanValue(this.value.length !== 0);
        }
        return undefined;
    }
}

/**
 * A null value
 */
export class NullValue extends ConcreteValue implements IHasLiteralExpression {
    /**
     * Return this value as a string, in Neolace Lookup Expression format.
     * This string should parse to an expression that yields the same value.
     */
    public override asLiteral(): string {
        return "null";
    }

    protected serialize() {
        return {};
    }

    protected override doCastTo(newType: ClassOf<LookupValue>, _context: LookupContext): LookupValue | undefined {
        if (newType === BooleanValue) {
            return new BooleanValue(false);
        }
        return undefined;
    }
}

/**
 * An error value - represents an error.
 *
 * Evaluating expressions will always throw an exception, not return an error value. However, in some use cases it makes
 * sense to catch those exceptions and convert them to error values, so that a value is always returned.
 */
export class ErrorValue extends ConcreteValue {
    public readonly error: LookupError;

    constructor(error: LookupError) {
        super();
        this.error = error;
    }

    public override asLiteral() {
        return undefined; // There is no literal expression for errors in general
    }

    protected serialize() {
        return { errorClass: this.error.constructor.name, message: this.error.message };
    }
}

/**
 * Represents an Entry
 */
export class EntryValue extends ConcreteValue implements IHasLiteralExpression {
    readonly id: VNID;

    constructor(id: VNID) {
        super();
        this.id = id;
    }

    /**
     * Return this value as a string, in Neolace Lookup Expression format.
     * This string should parse to an expression that yields the same value.
     */
    public override asLiteral(): string {
        return `[[/entry/${this.id}]]`; // e.g. [[/entry/_6FisU5zxXggLcDz4Kb3Wmd]]
    }

    protected override doCastTo(newType: ClassOf<LookupValue>, context: LookupContext): LookupValue | undefined {
        if (newType === LazyEntrySetValue) {
            return new LazyEntrySetValue(
                context,
                C`
                MATCH (entry:${Entry} {id: ${this.id}})-[:${Entry.rel.IS_OF_TYPE}]->(et:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(:${Site} {id: ${context.siteId}})
                WITH entry, {} AS annotations
            `,
            );
        }
        return undefined;
    }

    protected serialize() {
        return { id: this.id };
    }
}

/**
 * Represents an EntryType
 */
export class EntryTypeValue extends ConcreteValue implements IHasLiteralExpression {
    readonly id: VNID;

    constructor(id: VNID) {
        super();
        this.id = id;
    }

    /**
     * Return this value as a string, in Neolace Lookup Expression format.
     * This string should parse to an expression that yields the same value.
     */
    public override asLiteral(): string {
        return `[[/etype/${this.id}]]`; // e.g. [[/etype/_6FisU5zxXggLcDz4Kb3Wmd]]
    }

    protected serialize() {
        return { id: this.id };
    }
}

/**
 * Represents a Property (like "Date of birth", NOT a property value like "1990-05-15")
 */
export class PropertyValue extends ConcreteValue implements IHasLiteralExpression {
    readonly id: VNID;

    constructor(id: VNID) {
        super();
        this.id = id;
    }

    /**
     * Return this value as a string, in Neolace Lookup Expression format.
     * This string should parse to an expression that yields the same value.
     */
    public override asLiteral(): string {
        return `[[/prop/${this.id}]]`; // e.g. [[/prop/_6FisU5zxXggLcDz4Kb3Wmd]]
    }

    protected serialize() {
        return { id: this.id };
    }
}

/**
 * Represents a value that has been "annotated" with some extra information
 * (like property values get annotated with "note" and "rank", or ancestor
 * entries get annotated with "distance" from the current entry)
 */
export class AnnotatedValue extends ConcreteValue {
    readonly value: ConcreteValue;
    readonly annotations: Readonly<Record<string, ConcreteValue>>;

    constructor(value: ConcreteValue, annotations: Record<string, ConcreteValue>) {
        super();
        if (value instanceof AnnotatedValue) {
            // Special case: we just add annotations to the existing wrapper, don't wrap the value twice.
            this.value = value.value;
            this.annotations = { ...value.annotations, ...annotations };
        } else {
            this.value = value;
            this.annotations = annotations;
        }
        if (Object.keys(annotations).length === 0) {
            throw new Error(`Missing annotations`);
        }
        if (annotations.value !== undefined || annotations.id !== undefined) {
            throw new Error("Invalid annotation key.");
        }
    }

    protected serialize() {
        const annotations: Record<string, unknown> = {};
        for (const key in this.annotations) {
            annotations[key] = this.annotations[key].toJSON();
        }
        return { value: this.value.toJSON(), annotations };
    }

    protected override doCastTo(
        newType: ClassOf<LookupValue>,
        context: LookupContext,
    ): Promise<LookupValue | undefined> {
        return this.value.castTo(newType, context);
    }

    public override asLiteral() {
        return undefined; // Annotated values do not have literal expressions.
    }
}

/**
 * A file attached to an entry (using the Files feature)
 */
export class FileValue extends ConcreteValue {
    constructor(
        public readonly filename: string,
        public readonly url: string,
        public readonly contentType: string,
        public readonly size: number,
    ) {
        super();
    }

    public override asLiteral() {
        return undefined; // There is no literal expression for a file
    }

    protected serialize(): Omit<api.FileValue, "type"> {
        return {
            filename: this.filename,
            url: this.url,
            contentType: this.contentType,
            size: this.size,
        };
    }
}

interface ImageData {
    entryId: VNID;
    altText: string;
    imageUrl: string;
    contentType: string;
    size: number;
    width?: number;
    height?: number;
    blurHash?: string;
    borderColor?: [R: number, G: number, B: number, A: number];
    // Should this image be a link?
    link?: EntryValue | StringValue;
    // How the image should be displayed:
    format: api.ImageDisplayFormat;
    caption?: InlineMarkdownStringValue | StringValue;
    maxWidth?: number;
}

/**
 * An image
 */
export class ImageValue extends ConcreteValue {
    public readonly data: ImageData;

    constructor(data: ImageData) {
        super();
        this.data = data;
    }

    public override asLiteral() {
        return undefined; // There is no literal expression for an image
    }

    protected serialize(): Omit<api.ImageValue, "type"> {
        return {
            entryId: this.data.entryId,
            altText: this.data.altText,
            caption: this.data.caption?.toJSON() as api.InlineMarkdownString | api.StringValue | undefined,
            imageUrl: this.data.imageUrl,
            contentType: this.data.contentType,
            size: this.data.size,
            width: this.data.width,
            height: this.data.height,
            blurHash: this.data.blurHash,
            borderColor: this.data.borderColor,
            format: this.data.format,
            link: this.data.link?.toJSON() as api.StringValue | api.EntryValue | undefined,
            maxWidth: this.data.maxWidth,
        };
    }
}

/**
 * A subset of values from a larger value set.
 */
export class PageValue<T extends ConcreteValue> extends ConcreteValue {
    readonly values: ReadonlyArray<T>;
    readonly startedAt: bigint; // Also called "skip"
    readonly pageSize: bigint; // Also called "limit"
    readonly totalCount: bigint;

    constructor(
        values: ReadonlyArray<T>,
        { startedAt, pageSize, totalCount }: { startedAt: bigint; pageSize: bigint; totalCount: bigint },
    ) {
        super();
        this.values = values;
        this.startedAt = startedAt;
        this.pageSize = pageSize;
        this.totalCount = totalCount;
    }

    public override asLiteral() {
        return undefined; // There is no literal expression for a page
    }

    protected serialize() {
        return {
            values: this.values.map((v) => v.toJSON()),
            startedAt: Number(this.startedAt),
            pageSize: Number(this.pageSize),
            totalCount: Number(this.totalCount),
        };
    }

    /** Helper method to quickly make a "Page" value from a fixed array of values */
    static from<T extends ConcreteValue>(values: T[], minPageSize = 1n): PageValue<T> {
        const pageSize = values.length < minPageSize ? minPageSize : BigInt(values.length);
        return new PageValue(values, { startedAt: 0n, pageSize, totalCount: BigInt(values.length) });
    }
}

// /**
//  * An immutable array of values of fixed length.
//  * Values do not necessarily have to be of the same type, so this can work as a tuple.
//  */
// export class ListValue extends ConcreteValue implements ICountableValue {
//     readonly values: ReadonlyArray<ConcreteValue>;
//     readonly hasCount = true;

//     constructor(values: (ConcreteValue)[]) {
//         super();
//         this.values = values;
//     }

//     public async getCount(): Promise<bigint> {
//         return BigInt(this.values.length);
//     }

//     /**
//      * Return this value as a string, in Neolace Lookup Expression format.
//      * This string should parse to an expression that yields the same value.
//      */
//     public override asLiteral(): string|undefined {
//         const literalValues = this.values.map(v => v.asLiteral());
//         if (literalValues.includes(undefined)) {
//             return undefined;  // One of more of the values in this list cannot be expressed as a literal
//         }
//         return "[" + literalValues.join(", ") + "]";
//     }

//     protected serialize() {
//         return {
//             values: this.values.map(v => v.toJSON()),
//         };
//     }

//     protected override doCastTo(newType: ClassOf<LookupValue>, _context: LookupContext): LookupValue|undefined {
//         if (newType === PageValue) {
//             const totalCount = BigInt(this.values.length);
//             return new PageValue(this.values, {totalCount, pageSize: totalCount, startedAt: 0n});
//         }
//         return undefined;
//     }
// }

/**
 * An intermediate value that represents something like a database query, which we haven't yet evaluated.
 * The query (or whatever the lazy value is) may still be modified before it is evaluated. For example, a lazy entry
 * list might be reduced to simply retrieving the total number of matching entries, before it is evaluated.
 */
abstract class LazyValue extends LookupValue {
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
abstract class AbstractLazyCypherQueryValue extends LazyValue implements ICountableValue, IIterableValue {
    public readonly hasCount = true;
    public readonly isIterable = true;
    /**
     * The first part of the Cypher query, without a RETURN statement or SKIP, LIMIT, etc.
     */
    readonly cypherQuery: CypherQuery;
    private defaultPageSize: bigint;

    constructor(context: LookupContext, cypherQuery: CypherQuery) {
        super(context);
        this.defaultPageSize = context.defaultPageSize;
        this.cypherQuery = cypherQuery;
    }

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

        return new PageValue<ConcreteValue>(concreteValues, { startedAt: 0n, pageSize, totalCount });
    }

    public abstract getSlice(offset: bigint, numItems: bigint): Promise<LookupValue[]>;
}

/**
 * An annotation reviver is a function that converts a single raw value loaded from the Neo4j database into a
 * concrete lookup value, e.g. bigint -> IntegerValue
 *
 * It is only used with LazyEntrySetValue
 */
type AnnotationReviver = (annotatedValue: unknown) => ConcreteValue;

/**
 * A cypher query that evaluates to a set of entries, with optional annotations (extra data associated with each entry)
 */
export class LazyEntrySetValue extends AbstractLazyCypherQueryValue {
    readonly annotations: Readonly<Record<string, AnnotationReviver>> | undefined;

    constructor(
        context: LookupContext,
        cypherQuery: CypherQuery,
        options: { annotations?: Record<string, AnnotationReviver> } = {},
    ) {
        super(context, cypherQuery);
        this.annotations = options.annotations;
    }

    public async getSlice(offset: bigint, numItems: bigint): Promise<Array<EntryValue | AnnotatedValue>> {
        const query = C`
            ${this.cypherQuery}
            RETURN entry.id, annotations
            ${this.getSkipLimitClause(offset, numItems)}
        `.givesShape({ "entry.id": Field.VNID, annotations: Field.Any });
        const result = await this.context.tx.query(query);

        return result.map((r) => {
            if (this.annotations) {
                const annotatedValues: Record<string, ConcreteValue> = {};
                for (const key in this.annotations) {
                    annotatedValues[key] = this.annotations[key](r.annotations[key]);
                }
                return new AnnotatedValue(new EntryValue(r["entry.id"]), annotatedValues);
            } else {
                return new EntryValue(r["entry.id"]);
            }
        });
    }
}

/**
 * An iterable that uses a cypher query to produce some set of results that are not entries.
 * For an iterable that produces entries, use LazyEntrySetValue.
 */
export class LazyCypherIterableValue<ValueType extends LookupValue> extends AbstractLazyCypherQueryValue {
    constructor(
        context: LookupContext,
        cypherQuery: CypherQuery,
        public readonly getSlice: (offset: bigint, numItems: bigint) => Promise<ValueType[]>,
    ) {
        super(context, cypherQuery);
    }
}

/**
 * Some collection of iterable values, or abstract generator that can produce values.
 */
export class LazyIterableValue extends LazyValue implements IIterableValue {
    readonly hasCount: boolean;
    public readonly isIterable = true;
    public getCount?: () => Promise<bigint>;
    public getSlice: (offset: bigint, numItems: bigint) => Promise<LookupValue[]>;

    constructor({ context, getCount, getSlice }: {
        context: LookupContext;
        getCount?: () => Promise<bigint>;
        getSlice: (offset: bigint, numItems: bigint) => Promise<LookupValue[]>;
    }) {
        super(context);
        this.hasCount = getCount !== undefined;
        this.getCount = getCount;
        this.getSlice = getSlice;
    }

    public override async toDefaultConcreteValue(): Promise<PageValue<ConcreteValue>> {
        const pageSize = this.context.defaultPageSize;
        const slicedValues = await this.getSlice(0n, pageSize);
        let totalCount: bigint;
        if (slicedValues.length < pageSize) {
            totalCount = BigInt(slicedValues.length);
        } else {
            if (this.getCount) {
                totalCount = await this.getCount();
            } else {
                // We'll have to inefficiently count all the items in this iterator to determine the count.
                totalCount = BigInt(slicedValues.length);
                while (true) {
                    const countStep = 100n;
                    const nextCount = BigInt((await this.getSlice(totalCount, countStep)).length);
                    totalCount += nextCount;
                    if (nextCount < countStep) {
                        break;
                    }
                }
            }
        }
        const concreteValues: ConcreteValue[] = [];
        for (const value of slicedValues) {
            concreteValues.push(await value.makeConcrete());
        }
        return new PageValue(concreteValues, { pageSize, startedAt: 0n, totalCount });
    }
}

/** A helper function to create an annotated entry value */
export function MakeAnnotatedEntryValue(entryId: VNID, annotations: Record<string, ConcreteValue>) {
    return new AnnotatedValue(new EntryValue(entryId), annotations);
}
