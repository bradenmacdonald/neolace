import { LookupExpression } from "./base.ts";
import { EntryValue } from "../values.ts";
import { LookupEvaluationError } from "../errors.ts";
import { LookupContext } from "../context.ts";

/**
 * this: gets a reference to the "current entry", if there is one.
 */
export class This extends LookupExpression {
    public async getValue(context: LookupContext) {
        if (!context.entryId) {
            throw new LookupEvaluationError(`The keyword "this" only works in the context of a specific entry.`);
        }
        return new EntryValue(context.entryId);
    }

    public toString(): string {
        return "this";
    }
}
