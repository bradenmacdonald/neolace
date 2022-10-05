import { VNID } from "neolace/deps/vertex-framework.ts";
import type * as api from "neolace/deps/neolace-api.ts";
import type { LookupExpression } from "../expressions/base.ts";
import { ConcreteValue, IHasSourceExpression } from "./base.ts";

/**
 * A subset of values from a larger value set.
 */
export class PageValue<T extends ConcreteValue> extends ConcreteValue implements IHasSourceExpression {
    readonly values: ReadonlyArray<T>;
    readonly startedAt: bigint; // Also called "skip"
    readonly pageSize: bigint; // Also called "limit"
    readonly totalCount: bigint;
    /** The source expression can be used along with slice() to retrieve additional pages of the result. */
    readonly sourceExpression: LookupExpression | undefined;
    /** The entry used for any "this" expressions in the sourceExpression. This could be removed if we could erase "this" expressions. */
    readonly sourceExpressionEntryId: VNID | undefined;

    constructor(
        values: ReadonlyArray<T>,
        { startedAt, pageSize, totalCount, sourceExpression, sourceExpressionEntryId }: {
            startedAt: bigint;
            pageSize: bigint;
            totalCount: bigint;
            sourceExpression: LookupExpression | undefined;
            sourceExpressionEntryId: VNID | undefined;
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
        const v: api.PageValue = {
            type: "Page",
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

    public cloneWithSourceExpression(
        sourceExpression: LookupExpression | undefined,
        sourceExpressionEntryId: VNID | undefined,
    ): this {
        return new PageValue(this.values, {
            pageSize: this.pageSize,
            startedAt: this.startedAt,
            totalCount: this.totalCount,
            sourceExpression,
            sourceExpressionEntryId,
        }) as typeof this;
    }
}
