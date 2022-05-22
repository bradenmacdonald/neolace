import { C, CypherQuery, VNID } from "neolace/deps/vertex-framework.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { Site } from "neolace/core/Site.ts";
import { LookupContext } from "../context.ts";
import { LookupExpression } from "../expression.ts";
import { ClassOf, ConcreteValue, IIterableValue, LazyValue, LookupValue } from "./base.ts";
import { EntryValue } from "./EntryValue.ts";
import { PageValue } from "./PageValue.ts";
import { LazyEntrySetValue } from "./LazyEntrySetValue.ts";
import { LookupEvaluationError } from "../errors.ts";

/**
 * Some collection of iterable values, or abstract generator that can produce values.
 */
export class LazyIterableValue extends LazyValue implements IIterableValue {
    readonly hasCount: boolean;
    public readonly isIterable = true;
    public getCount?: () => Promise<bigint>;
    public getSlice: (offset: bigint, numItems: bigint) => Promise<LookupValue[]>;
    public readonly sourceExpression?: LookupExpression;
    public readonly sourceExpressionEntryId?: VNID;

    constructor({ context, getCount, getSlice, ...misc }: {
        context: LookupContext;
        getCount?: () => Promise<bigint>;
        getSlice: (offset: bigint, numItems: bigint) => Promise<LookupValue[]>;
        sourceExpression?: LookupExpression;
        sourceExpressionEntryId?: VNID;
    }) {
        super(context);
        this.hasCount = getCount !== undefined;
        this.getCount = getCount;
        this.getSlice = getSlice;
        this.sourceExpression = misc.sourceExpression;
        this.sourceExpressionEntryId = misc.sourceExpressionEntryId;
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
        return new PageValue(concreteValues, {
            pageSize,
            startedAt: 0n,
            totalCount,
            sourceExpression: this.sourceExpression,
            sourceExpressionEntryId: this.sourceExpressionEntryId,
        });
    }

    protected override async doCastTo(
        newType: ClassOf<LookupValue>,
        context: LookupContext,
    ): Promise<LookupValue | undefined> {
        if (newType === LazyEntrySetValue) {
            // Special case handling to allow things like [entry1, entry2]
            // or [this, this.ancestors(), this.descendants()] to act like a combined entry set, e.g. to graph them all.
            // Tests for this are in ancestors.test.ts

            const entryIds: VNID[] = [];
            const entryQueries: CypherQuery[] = [];

            const pageSize = 100n; // Load 100 values from this iterable at a time.
            for (let i = 0n; true; i++) {
                const slice = await this.getSlice(pageSize * i, pageSize);
                // For each item in this iterable/list:
                for (const value of slice) {
                    // Is this a single entry?
                    const valueAsEntry = await value.castTo(EntryValue, context);
                    if (valueAsEntry) {
                        // This value is a single entry. Add it to our set of entry IDs.
                        entryIds.push(valueAsEntry.id);
                        continue;
                    }
                    // Or is it a set of entries, represented by a query?
                    const valueAsEntrySet = await value.castTo(LazyEntrySetValue, context);
                    if (valueAsEntrySet) {
                        entryQueries.push(valueAsEntrySet.cypherQuery);
                        continue;
                    }
                    // Otherwise, we can't convert this iterable to a set of entries unfortunately.
                    throw new LookupEvaluationError(
                        `The iterable contains a value "${value.asLiteral()}" which does not represent an entry or entry set.`,
                    );
                }
                if (slice.length < pageSize) {
                    break;
                }
            }

            let query = C`
                CALL {
                    MATCH (entry:${Entry})-[:${Entry.rel.IS_OF_TYPE}]->(et:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(:${Site} {id: ${context.siteId}})
                    WHERE entry.id IN ${entryIds}
                    RETURN entry
            `;
            for (const q of entryQueries) {
                query = C`
                    ${query}
                    UNION
                    ${q}
                    RETURN entry
                `;
            }
            query = C`${query}
                }
                WITH entry, {} AS annotations
            `;

            return new LazyEntrySetValue(context, query);
        }
        return undefined;
    }
}
