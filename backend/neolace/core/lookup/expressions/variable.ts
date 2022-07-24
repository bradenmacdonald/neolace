import { LookupExpression } from "./base.ts";
import { LookupContext } from "../context.ts";
import { LambdaValue } from "../values/LambdaValue.ts";
import { LookupEvaluationError } from "../errors.ts";

/**
 * A variable is a placeholder that references a value.
 *
 * Note: currently 'this' is not a variable; it is a separate, unique expression. We may want to make it a variable
 * in the future for consistency.
 */
export class Variable extends LookupExpression {
    constructor(
        public readonly variableName: string,
    ) {
        super();
    }

    public async getValue(_context: LookupContext): Promise<LambdaValue> {
        if (this.variableName === "this") {
            throw new LookupEvaluationError(`"${this.variableName}" cannot be used as a variable name.`);
        }
        throw new LookupEvaluationError(`Temporarily, "${this.variableName}" cannot be evaluated.`);
    }

    public toString(): string {
        return this.variableName;
    }
}
