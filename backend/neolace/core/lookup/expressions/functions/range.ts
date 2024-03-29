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
import { isIterableValue, LookupValue, NullValue, RangeValue } from "../../values.ts";
import { LookupEvaluationError } from "../../errors.ts";
import { LookupContext } from "../../context.ts";
import { LookupFunctionOneArg } from "./base.ts";
import { iterateOver } from "../../values/base.ts";

/**
 * range([iterable expression])
 *
 * Given any iterable of integer, quantity, or date values, find the highest and lowest values and return a range
 * object.
 */
export class Range extends LookupFunctionOneArg {
    static functionName = "range";

    /** This is the iterable that we're going to scan for min/max values */
    public get iterableExpr(): LookupExpression {
        return this.firstArg;
    }

    public async getValue(context: LookupContext): Promise<RangeValue> {
        const iterableValue = await this.iterableExpr.getValue(context);
        if (!isIterableValue(iterableValue)) {
            throw new LookupEvaluationError(
                `The expression "${this.iterableExpr.toDebugString()}" is not an iterable so can't be used with range().`,
            );
        }

        let min: LookupValue | undefined;
        let max: LookupValue | undefined;

        for await (const value of iterateOver(iterableValue)) {
            if (value instanceof RangeValue) {
                // Special case for handling range values:
                if (min === undefined || max === undefined) {
                    min = value.min;
                    max = value.max;
                } else {
                    if (value.min.compareTo(min) < 0) min = value.min;
                    else if (value.max.compareTo(max) > 0) max = value.max;
                }
                continue;
            } else if (value instanceof NullValue) {
                continue; // Ignore null values (e.g. missing data for some entries)
            }

            // Normal case for handling any non-range values:
            if (min === undefined || max === undefined) {
                min = max = value;
                continue;
            }
            if (value.compareTo(min) < 0) min = value;
            else if (value.compareTo(max) > 0) max = value;
        }

        if (min === undefined || max === undefined) {
            throw new LookupEvaluationError(`range() cannot work with an empty list.`);
        }

        return new RangeValue(min, max);
    }
}
