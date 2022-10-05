import { CypherQuery, VNID } from "neolace/deps/vertex-framework.ts";
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
        cypherQuery: CypherQuery,
        public readonly getSlice: (offset: bigint, numItems: bigint) => Promise<ValueType[]>,
        options: {
            sourceExpression?: LookupExpression;
            sourceExpressionEntryId?: VNID;
        } = {},
    ) {
        super(context, cypherQuery, options.sourceExpression, options.sourceExpressionEntryId);
    }

    public cloneWithSourceExpression(
        sourceExpression: LookupExpression,
        sourceExpressionEntryId: VNID,
    ): LazyCypherIterableValue<ValueType> {
        return new LazyCypherIterableValue(this.context, this.cypherQuery, this.getSlice, {
            sourceExpression,
            sourceExpressionEntryId,
        });
    }
}
