import { LookupExpression } from "../base.ts";
import { BooleanValue, isIterableValue, LambdaValue, LazyIterableValue, LookupValue, NullValue } from "../../values.ts";
import { LookupEvaluationError } from "../../errors.ts";
import { LookupContext } from "../../context.ts";
import { LookupFunctionWithArgs } from "./base.ts";
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

        const values: [value: LookupValue, sortKey: LookupValue][] = [];
        if (sortBy) {
            for await (const value of iterateOver(iterableValue)) {
                const itemContext = context.childContextWithVariables({
                    [sortBy.variableName]: value,
                });
                const sortKey = await itemContext.evaluateExpr(sortBy.innerExpression);
                values.push([value, sortKey]);
            }
        } else {
            for await (const value of iterateOver(iterableValue)) {
                values.push([value, value]);
            }
        }

        // We always sort NULL values to the end, regardless of the 'reverse' direction or not.
        const doSort = (a: LookupValue, b: LookupValue, reverse?: boolean) => (
            a instanceof NullValue ? 1 : b instanceof NullValue ? -1 : reverse ? b.compareTo(a) : a.compareTo(b)
        );
        values.sort((a, b) => doSort(a[1], b[1], reverse));

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
