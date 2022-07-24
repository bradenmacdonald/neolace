import { LookupExpression } from "../base.ts";
import { LookupContext } from "../../context.ts";
import { LookupEvaluationError } from "../../errors.ts";
import { LookupFunctionWithArgs } from "./base.ts";
import { isCountableValue, isIterableValue, LambdaValue, LazyIterableValue, LookupValue } from "../../values.ts";

/**
 * map(list, apply): given a list or iterable, transform it to a new list/iterable by applying the given lambda
 * expression.
 *
 * e.g. [1, 2, 3].map(apply=(x -> x * x)) will result in the new list [1, 4, 9]
 */
export class Map extends LookupFunctionWithArgs {
    static functionName = "map";

    /** The iterable that we want to apply the map to */
    public get iterableExpr(): LookupExpression {
        return this.firstArg;
    }

    /** The function we're going to apply to each element in the list to produce the new list */
    public get applyExpr(): LookupExpression {
        return this.otherArgs["apply"];
    }

    protected override validateArgs(): void {
        this.requireArgs(["apply"]);
    }

    public async getValue(context: LookupContext): Promise<LazyIterableValue> {
        const innerValue = await this.iterableExpr.getValue(context);
        if (!isIterableValue(innerValue)) {
            throw new LookupEvaluationError(
                `The expression "${this.iterableExpr.toDebugString()}" cannot be used with map().`,
            );
        }

        const lambda = await this.applyExpr.getValueAs(LambdaValue, context);

        const getSlice = async (offset: bigint, numItems: bigint): Promise<LookupValue[]> => {
            const originalSlice = await innerValue.getSlice(offset, numItems);
            const newSlicePromises = [];
            // TODO: to optimize this in the future, we need a way to ask the innerExpression to pre-retrieve the data
            // it needs for each entry in the slice, before we evaluate the inner expression for each item.
            for (const value of originalSlice) {
                const itemContext = context.childContextWithVariables({
                    [lambda.variableName]: value,
                });
                const newValuePromise = lambda.innerExpression.getValue(itemContext);
                newSlicePromises.push(newValuePromise);
            }
            return await Promise.all(newSlicePromises);
        };

        return new LazyIterableValue({
            context,
            getSlice,
            sourceExpression: this,
            sourceExpressionEntryId: context.entryId,
            getCount: isCountableValue(innerValue) ? () => innerValue.getCount() : undefined,
        });
    }
}
