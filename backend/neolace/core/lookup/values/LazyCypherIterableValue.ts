import { CypherQuery } from "neolace/deps/vertex-framework.ts";
import { LookupContext } from "../context.ts";
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
    ) {
        super(context, cypherQuery);
    }
}
