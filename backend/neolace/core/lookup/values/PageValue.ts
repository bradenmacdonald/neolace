import { VNID } from "neolace/deps/vertex-framework.ts";
import type * as api from "neolace/deps/neolace-api.ts";
import { LookupExpression } from "../expression.ts";
import { ConcreteValue } from "./base.ts";

/**
 * A subset of values from a larger value set.
 */
export class PageValue<T extends ConcreteValue> extends ConcreteValue {
    readonly values: ReadonlyArray<T>;
    readonly startedAt: bigint; // Also called "skip"
    readonly pageSize: bigint; // Also called "limit"
    readonly totalCount: bigint;
    /** The source expression can be used along with slice() to retrieve additional pages of the result. */
    readonly sourceExpression?: LookupExpression;
    /** The entry used for any "this" expressions in the sourceExpression. This could be removed if we could erase "this" expressions. */
    readonly sourceExpressionEntryId?: VNID;

    constructor(
        values: ReadonlyArray<T>,
        { startedAt, pageSize, totalCount, sourceExpression, sourceExpressionEntryId }: {
            startedAt: bigint;
            pageSize: bigint;
            totalCount: bigint;
            sourceExpression?: LookupExpression;
            sourceExpressionEntryId?: VNID;
        },
    ) {
        super();
        this.values = values;
        this.startedAt = startedAt;
        this.pageSize = pageSize;
        this.totalCount = totalCount;
        this.sourceExpression = sourceExpression;
        this.sourceExpressionEntryId = sourceExpressionEntryId;
    }

    public override asLiteral() {
        return undefined; // There is no literal expression for a page
    }

    protected serialize() {
        const v: Omit<api.PageValue, "type"> = {
            values: this.values.map((v) => v.toJSON()),
            startedAt: Number(this.startedAt),
            pageSize: Number(this.pageSize),
            totalCount: Number(this.totalCount),
        };
        if (this.sourceExpression) {
            v.source = { expr: this.sourceExpression.toString() };
            if (this.sourceExpressionEntryId) {
                v.source.entryId = this.sourceExpressionEntryId;
            }
        }
        return v;
    }

    /** Helper method to quickly make a "Page" value from a fixed array of values */
    static from<T extends ConcreteValue>(values: T[], minPageSize = 1n): PageValue<T> {
        const pageSize = values.length < minPageSize ? minPageSize : BigInt(values.length);
        return new PageValue(values, { startedAt: 0n, pageSize, totalCount: BigInt(values.length) });
    }
}
