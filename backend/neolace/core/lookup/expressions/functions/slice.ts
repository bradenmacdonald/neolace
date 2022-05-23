import { LookupExpression } from "../base.ts";
import { IntegerValue, isCountableValue, isIterableValue, PageValue } from "../../values.ts";
import { LookupEvaluationError } from "../../errors.ts";
import { LookupContext } from "../../context.ts";
import { LookupFunctionWithArgs } from "./base.ts";

/**
 * slice([iterable expression], [start=index], [size=length], [end=index])
 *
 * Given any iterable, take a slice out of it. This will return a PageValue or a List.
 */
export class Slice extends LookupFunctionWithArgs {
    static functionName = "slice";

    /** The iterable we want to slice */
    public get iterableExpr(): LookupExpression {
        return this.firstArg;
    }
    /** Index to start the slice at. If negative, it means counting from the end. If omitted, starts at zero. */
    public get startIndexExpr(): LookupExpression | undefined {
        return this.otherArgs["start"];
    }

    /** Index to end the slice at. If negative, it means counting from the end. If omitted, ends at the end. */
    public get endIndexExpr(): LookupExpression | undefined {
        return this.otherArgs["end"];
    }

    /** Maximum size of the slice. If both 'end' and 'size' are specified, whichever is smaller will be used. */
    public get sizeExpr(): LookupExpression | undefined {
        return this.otherArgs["size"];
    }

    protected override validateArgs(): void {
        this.requireArgs([], { optional: ["start", "end", "size"] });
    }

    public async getValue(context: LookupContext) {
        const iterableValue = await this.iterableExpr.getValue(context);

        if (!isIterableValue(iterableValue)) {
            throw new LookupEvaluationError(
                `The expression "${this.iterableExpr.toDebugString()}" is not iterable.`,
            );
        }
        if (!isCountableValue(iterableValue)) {
            // In the future we may implement support for this, slicing to some type of list value instead of a page value.
            throw new LookupEvaluationError(
                `The total size of the expression "${this.iterableExpr.toDebugString()}" is unknown, so it cannot be sliced. This limitation may be removed in the future.`,
            );
        }

        const totalCount = await iterableValue.getCount();

        // Compute the start index:
        let start = 0n;
        if (this.startIndexExpr) {
            const startIndexValue = await this.startIndexExpr.getValueAs(IntegerValue, context);
            if (startIndexValue.value < 0) {
                // Since 'startIndex' is negative, count from the end
                start = totalCount + startIndexValue.value;
            } else {
                start = startIndexValue.value;
            }
            // Keep the start value in range:
            if (start < 0n) {
                start = 0n;
            } else if (start > totalCount) {
                start = totalCount;
            }
        }

        // Compute the end index:
        let end = totalCount;
        if (this.endIndexExpr) {
            const endIndexValue = await this.endIndexExpr.getValueAs(IntegerValue, context);
            if (endIndexValue.value < 0) {
                // Since 'endIndex' is negative, count from the end
                end = totalCount + endIndexValue.value;
            } else {
                end = endIndexValue.value;
            }
            // Keep the end value in range:
            if (end < 0n) {
                end = 0n;
            } else if (end > totalCount) {
                end = totalCount;
            }
        }

        if (this.sizeExpr) {
            const sizeValue = await this.sizeExpr.getValueAs(IntegerValue, context);
            if (sizeValue.value < 0) {
                throw new LookupEvaluationError(`The size parameter of slice() cannot be negative.`);
            }
            if (end - start > sizeValue.value) {
                end = start + sizeValue.value;
            }
        }

        const size = end - start;
        const values = await Promise.all(
            (await iterableValue.getSlice(start, size)).map((v) => v.makeConcrete()),
        );

        return new PageValue(values, {
            startedAt: start,
            totalCount,
            pageSize: size,
            sourceExpression: this.iterableExpr,
            sourceExpressionEntryId: context.entryId,
        });
    }
}
