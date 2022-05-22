import { LookupExpression } from "../base.ts";
import { BooleanValue, NullValue } from "../../values.ts";
import { LookupEvaluationError } from "../../errors.ts";
import { LookupContext } from "../../context.ts";

/**
 * if([boolean expression], then=[some value], else=[some value])
 *
 * Given an expression, if it is truthy, return the 'then' value (or the boolean expression itself if no 'then')
 * is specified; otherwise return the 'else' value, or NULL if no 'else' value is specified.
 */
export class If extends LookupExpression {
    // An expression that is truthy or falsy
    readonly conditionExpr: LookupExpression;
    // Value to return if 'booleanExpr' is truthy
    readonly thenExpr?: LookupExpression;
    // Value to return if 'booleanExpr' is not truthy
    readonly elseExpr?: LookupExpression;

    constructor(
        conditionExpr: LookupExpression,
        extraParams: {
            thenExpr?: LookupExpression;
            elseExpr?: LookupExpression;
        },
    ) {
        super();
        this.conditionExpr = conditionExpr;
        this.thenExpr = extraParams.thenExpr;
        this.elseExpr = extraParams.elseExpr;
    }

    public async getValue(context: LookupContext) {
        const booleanValue = await (await this.conditionExpr.getValue(context)).castTo(BooleanValue, context);
        if (booleanValue === undefined) {
            throw new LookupEvaluationError(
                `The expression "${this.conditionExpr.toDebugString()}" cannot be converted to a boolean (true/false).`,
            );
        }
        if (booleanValue.value) {
            // The condition is true:
            if (this.thenExpr) {
                return await this.thenExpr.getValue(context);
            } else {
                return await this.conditionExpr.getValue(context); // e.g. if(something) will return 'something' only if it's truthy, else NULL
            }
        } else {
            // The condition is false:
            if (this.elseExpr) {
                return await this.elseExpr.getValue(context);
            } else {
                return new NullValue();
            }
        }
    }

    public toString(): string {
        const thenPart = this.thenExpr ? `, then=${this.thenExpr.toString()}` : "";
        const elsePart = this.elseExpr ? `, else=${this.elseExpr.toString()}` : "";
        return `if(${this.conditionExpr.toString()}${thenPart}${elsePart})`;
    }
}
