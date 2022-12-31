import { LookupExpression } from "../base.ts";
import {
    BooleanValue,
    ConcreteValue,
    IntegerValue,
    isCountableValue,
    isIterableValue,
    LazyEntrySetValue,
    PageValue,
} from "../../values.ts";
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

    /**
     * If the expression to slice is already a slice, "unslice" it and then re-slice it.
     * This is an advanced use cases mostly for implementing pagination in the UI. Generally you won't need to use this.
     */
    public get resliceExpr(): LookupExpression | undefined {
        return this.otherArgs["reslice"];
    }

    protected override validateArgs(): void {
        this.requireArgs([], { optional: ["start", "end", "size", "reslice"] });
    }

    public async getValue(context: LookupContext): Promise<PageValue<ConcreteValue>> {
        const reslice: boolean = this.resliceExpr
            ? (await this.resliceExpr.getValueAs(BooleanValue, context)).value
            : false;
        let iterableExpr = this.iterableExpr;
        if (reslice && this.iterableExpr instanceof Slice) {
            iterableExpr = this.iterableExpr.iterableExpr;
        }
        // This is the iterable that we're going to take a slice out of:
        const iterableValue = await iterableExpr.getValue(context);

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

        if (iterableValue instanceof LazyEntrySetValue) {
            // Check if we can do an optimized slice() that doesn't require computing the totalCount first.
            const startIndexValue = await this.startIndexExpr?.getValueAs(IntegerValue, context) ??
                new IntegerValue(0n);
            const sizeValue = await this.sizeExpr?.getValueAs(IntegerValue, context) ??
                new IntegerValue(context.defaultPageSize);
            if (startIndexValue.value >= 0 && sizeValue.value > 0 && this.endIndexExpr === undefined) {
                // Yes, under these conditions we can use a more optimized computation:
                const start = startIndexValue.value, size = sizeValue.value;
                const { values, totalCount } = await iterableValue.runQuery(start, size);
                return new PageValue(values, {
                    startedAt: start,
                    totalCount,
                    pageSize: size,
                    sourceExpression: iterableExpr,
                    sourceExpressionEntryId: context.entryId,
                });
            }
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
            sourceExpression: iterableExpr,
            sourceExpressionEntryId: context.entryId,
        });
    }
}
