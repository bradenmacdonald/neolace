import { LookupExpression } from "../base.ts";
import { IntegerValue, isCountableValue } from "../../values.ts";
import { LookupContext } from "../../context.ts";
import { LookupEvaluationError } from "../../errors.ts";
import { LookupFunctionOneArg } from "./base.ts";

/**
 * count(entry): returns the count of the specified value
 * -> Lazy Query: give the number of results (rows)
 * -> List: give the number of items in the list
 */
export class Count extends LookupFunctionOneArg {
    static functionName = "count";
    /** An expression that specifies what value's count we want to retrieve */
    public get exprToCount(): LookupExpression {
        return this.firstArg;
    }

    public async getValue(context: LookupContext) {
        const valueToCount = await this.exprToCount.getValue(context);
        if (isCountableValue(valueToCount)) {
            return new IntegerValue(await valueToCount.getCount());
        } else {
            throw new LookupEvaluationError(
                `The expression "${this.exprToCount.toDebugString()}" cannot be counted with count().`,
            );
        }
    }
}
