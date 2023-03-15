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
import { LookupContext } from "../context.ts";
import { LookupExpression } from "../expressions/base.ts";
import { AbstractLazyCypherQueryValue, LookupValue } from "./base.ts";

/**
 * An iterable that uses a cypher query to produce some set of results that are not entries.
 * For an iterable that produces entries, use LazyEntrySetValue.
 */
export class LazyCypherIterableValue<ValueType extends LookupValue> extends AbstractLazyCypherQueryValue {
    constructor(
        context: LookupContext,
        public readonly runQuery: (
            offset: bigint,
            numItems: bigint,
        ) => Promise<{ values: ValueType[]; totalCount: bigint }>,
        options: {
            sourceExpression?: LookupExpression;
            sourceExpressionEntryId?: VNID;
        } = {},
    ) {
        super(context, options.sourceExpression, options.sourceExpressionEntryId);
    }

    public cloneWithSourceExpression(
        sourceExpression: LookupExpression,
        sourceExpressionEntryId: VNID,
    ): LazyCypherIterableValue<ValueType> {
        return new LazyCypherIterableValue(this.context, this.runQuery, {
            sourceExpression,
            sourceExpressionEntryId,
        });
    }
}
