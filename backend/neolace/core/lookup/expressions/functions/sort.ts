import { LookupExpression } from "../base.ts";
import { BooleanValue, isIterableValue, LambdaValue, LazyIterableValue, LookupValue } from "../../values.ts";
import { LookupEvaluationError } from "../../errors.ts";
import { LookupContext } from "../../context.ts";
import { LookupFunctionWithArgs } from "./base.ts";
import { Variable } from "../../expressions.ts";
import { iterateOver } from "../../values/base.ts";

/**
 * slice([iterable expression], by=[lambda])
 *
 * Given any iterable sort it by the given expression.
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
        const sortBy: LambdaValue = this.sortByExpr
            ? (await this.sortByExpr.getValueAs(LambdaValue, context))
            : new LambdaValue({ context, variableName: "_v", innerExpression: new Variable("_v") }); // By default, sort on the values in the iterable
        // This is the iteral that we're going to take a slice out of:
        const iterableValue = await this.iterableExpr.getValue(context);

        if (!isIterableValue(iterableValue)) {
            throw new LookupEvaluationError(
                `The expression "${this.iterableExpr.toDebugString()}" is not sortable.`,
            );
        }

        const values: [value: LookupValue, sortKey: string][] = [];
        for await (const value of iterateOver(iterableValue)) {
            const itemContext = context.childContextWithVariables({
                [sortBy.variableName]: value,
            });
            const sortKey = await itemContext.evaluateExpr(sortBy.innerExpression);
            values.push([value, sortKey.getSortString()]);
        }
        if (reverse) {
            values.sort((a, b) => b[1].localeCompare(a[1]));
        } else {
            values.sort((a, b) => a[1].localeCompare(b[1]));
        }

        return new LazyIterableValue({
            context,
            sourceExpression: this,
            sourceExpressionEntryId: context.entryId,
            getCount: async () => BigInt(values.length),
            getSlice: async (offset: bigint, numItems: bigint) => {
                return values.map(([value, _sortKey]) => value).slice(Number(offset), Number(offset + numItems));
            },
        });
    }
}
