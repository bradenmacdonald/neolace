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
import { isIterableValue, NullValue } from "../../values.ts";
import { LookupContext } from "../../context.ts";
import { LookupEvaluationError } from "../../errors.ts";
import { LookupFunctionOneArg } from "./base.ts";

/**
 * first(value): given an iterable, return the first item, or null if there is
 * no first item.
 */
export class First extends LookupFunctionOneArg {
    static functionName = "first";
    /** An expression that we want to take the first item from */
    public get expr(): LookupExpression {
        return this.firstArg;
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
}
