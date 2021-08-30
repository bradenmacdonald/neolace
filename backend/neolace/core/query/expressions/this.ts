import { QueryExpression } from "../expression.ts";
import { EntryValue } from "../values.ts";
import { QueryEvaluationError } from "../errors.ts";
import { QueryContext } from "../context.ts";

/**
 * this: gets a reference to the "current entry", if there is one.
 */
 export class This extends QueryExpression {

    // deno-lint-ignore require-await
    public async getValue(context: QueryContext) {
        if (!context.entryId) {
            throw new QueryEvaluationError(`The keyword "this" only works in the context of a specific entry.`);
        }
        return new EntryValue(context.entryId);
    }

    public toString(): string {
        return "this";
    }
}
