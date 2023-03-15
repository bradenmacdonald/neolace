/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { LookupExpression } from "../base.ts";
import { BooleanValue, NullValue } from "../../values.ts";
import { LookupEvaluationError } from "../../errors.ts";
import { LookupContext } from "../../context.ts";
import { LookupFunctionWithArgs } from "./base.ts";

/**
 * if([boolean expression], then=[some value], else=[some value])
 *
 * Given an expression, if it is truthy, return the 'then' value (or the boolean expression itself if no 'then')
 * is specified; otherwise return the 'else' value, or NULL if no 'else' value is specified.
 */
export class If extends LookupFunctionWithArgs {
    static functionName = "if";

    /** An expression that is truthy or falsy */
    public get conditionExpr(): LookupExpression {
        return this.firstArg;
    }
    /** Value to return if 'conditionExpr' is truthy */
    public get thenExpr(): LookupExpression | undefined {
        return this.otherArgs["then"];
    }
    /** Value to return if 'conditionExpr' is not truthy */
    public get elseExpr(): LookupExpression | undefined {
        return this.otherArgs["else"];
    }

    protected override validateArgs(): void {
        this.requireArgs([], { optional: ["then", "else"] });
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
                // e.g. if(something) will return 'something' only if it's truthy, otherwise elseExpr
                return await this.conditionExpr.getValue(context);
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
}
