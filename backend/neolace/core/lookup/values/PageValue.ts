/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { VNID } from "neolace/deps/vertex-framework.ts";
import type * as api from "neolace/deps/neolace-sdk.ts";
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
