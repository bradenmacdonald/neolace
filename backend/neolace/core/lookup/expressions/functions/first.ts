import { LookupExpression } from "../base.ts";
import { isIterableValue, NullValue } from "../../values.ts";
import { LookupContext } from "../../context.ts";
import { LookupEvaluationError } from "../../errors.ts";

/**
 * first(value): given an iterable, return the first item, or null if there is
 * no first item.
 */
export class First extends LookupExpression {
    // An expression that we want to take the first item from
    readonly expr: LookupExpression;

    constructor(expr: LookupExpression) {
        super();
        this.expr = expr;
    }

    public async getValue(context: LookupContext) {
        const innerValue = await this.expr.getValue(context);
        if (isIterableValue(innerValue)) {
            const slicedValue = await innerValue.getSlice(0n, 1n);
            if (slicedValue.length === 1) {
                return slicedValue[0];
            } else {
                return new NullValue();
            }
        } else {
            throw new LookupEvaluationError(
                `The expression "${this.expr.toDebugString()}" cannot be used with first().`,
            );
        }
    }

    public toString(): string {
        return `first(${this.expr.toString()})`;
    }
}
