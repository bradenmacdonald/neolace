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
import { BooleanValue, isIterableValue, LambdaValue, LazyIterableValue, LookupValue, NullValue } from "../../values.ts";
import { LookupEvaluationError } from "../../errors.ts";
import { LookupContext } from "../../context.ts";
import { LookupFunctionWithArgs } from "./base.ts";
import { isCountableValue, iterateOver } from "../../values/base.ts";

/**
 * sort([iterable expression], by=[lambda])
 *
 * Given any iterable, sort it by the given expression.
 * e.g. allEntries().sort(by=(e->e.name)) to sort all entries by name.
 */
export class Sort extends LookupFunctionWithArgs {
    static functionName = "sort";

    /** The iterable we want to sort */
    public get iterableExpr(): LookupExpression {
        return this.firstArg;
    }
    /** Optional lambda expression that returns a single value to sort the iterable by */
    public get sortByExpr(): LookupExpression | undefined {
        return this.otherArgs["by"];
    }

    /** Reverse the sort direction (use descending). */
    public get reverseExpr(): LookupExpression | undefined {
        return this.otherArgs["reverse"];
    }

    protected override validateArgs(): void {
        this.requireArgs([], { optional: ["by", "reverse"] });
    }

    public async getValue(context: LookupContext): Promise<LazyIterableValue> {
        const reverse: boolean = this.reverseExpr
            ? (await this.reverseExpr.getValueAs(BooleanValue, context)).value
            : false;
        const sortBy: LambdaValue | undefined = this.sortByExpr
            ? (await this.sortByExpr.getValueAs(LambdaValue, context))
            : undefined; // By default, sort on the values in the iterable
        // This is the iterable that we're going to sort:
        const iterableValue = await this.iterableExpr.getValue(context);

        if (!isIterableValue(iterableValue)) {
            throw new LookupEvaluationError(
                `The expression "${this.iterableExpr.toDebugString()}" is not sortable.`,
            );
        }

        // We always sort NULL values to the end, regardless of the 'reverse' direction or not.
        const compareDirect = (a: LookupValue, b: LookupValue) =>
            a instanceof NullValue ? 1 : b instanceof NullValue ? -1 : reverse ? b.compareTo(a) : a.compareTo(b);
        const compare = (a: { sortValue: LookupValue }, b: { sortValue: LookupValue }) =>
            compareDirect(a.sortValue, b.sortValue);
        let cachedTotalCount: bigint | undefined;

        return new LazyIterableValue({
            context,
            sourceExpression: this,
            sourceExpressionEntryId: context.entryId,
            getCount: async () => {
                // Get the total count in the most efficient way we are able to:
                if (cachedTotalCount) return cachedTotalCount;
                if (isCountableValue(iterableValue)) return iterableValue.getCount();
                let count = 0n;
                for await (const _value of iterateOver(iterableValue)) count++;
                return count;
            },
            getSlice: async (offset: bigint, numItems: bigint) => {
                const slicedValues: { value: LookupValue; sortValue: LookupValue }[] = [];
                const lengthNeeded = Number(offset) + Number(numItems);
                let totalSeen = 0;

                // We don't actually do the sorting until now, so that e.g. if we want the first 100 of 10 billion
                // items, we only ever keep 100 items in memory - not 10 billion. However, if we want to skip 100,000
                // items and then return 500, we'll need to hold 100,500 items in memory to produce the result.

                for await (const value of iterateOver(iterableValue)) {
                    totalSeen++;
                    let sortValue = value;
                    if (sortBy) {
                        const itemContext = context.childContextWithVariables({
                            [sortBy.variableName]: value,
                        });
                        sortValue = await itemContext.evaluateExpr(sortBy.innerExpression);
                    }

                    if (slicedValues.length < lengthNeeded) {
                        // Add this value into the array at the right place. The array may be empty.
                        let idx = 0;
                        while (
                            idx <= slicedValues.length - 1 && (
                                reverse // We need a slightly different comparison here to make this stable in reverse (preserve order of entries)
                                    ? compare({ sortValue }, slicedValues[idx]) > 0
                                    : compare({ sortValue }, slicedValues[idx]) >= 0
                            )
                        ) {
                            idx++;
                        }
                        slicedValues.splice(idx, 0, { value, sortValue });
                    } else if (compare({ sortValue }, slicedValues[0]) < 0) {
                        // This comes before the current first value in slicedValues.
                        slicedValues.unshift({ value, sortValue });
                        slicedValues.pop();
                    } else if (compare({ sortValue }, slicedValues[slicedValues.length - 1]) > 1) {
                        // This comes after the current last value in slicedValues
                        // We can ignore this value - it definitely won't be included in the result set.
                    } else {
                        // This value needs to be inserted into 'slicedValues' at the right place:
                        for (let idx = 0; idx < slicedValues.length - 1; idx++) {
                            if (
                                reverse
                                    ? compare({ sortValue }, slicedValues[idx]) <= 0
                                    : compare({ sortValue }, slicedValues[idx]) < 0
                            ) {
                                slicedValues.splice(idx, 0, { value, sortValue });
                                slicedValues.pop(); // Keep the same length.
                                break;
                            }
                        }
                    }
                }
                cachedTotalCount = BigInt(totalSeen);

                return slicedValues.slice(Number(offset), Number(offset + numItems)).map((sv) => sv.value);
            },
        });
    }
}
