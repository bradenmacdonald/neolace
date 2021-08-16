import { QueryContext } from "./context.ts";
import { QueryEvaluationError } from "./errors.ts";
import { QueryValue } from "./values.ts";


/**
 * Base class for a Query Expression, something that evaluates to a value.
 */
export abstract class QueryExpression {
    public abstract getValue(context: QueryContext): Promise<QueryValue>;

    // deno-lint-ignore no-explicit-any
    public async getValueAs<ValueType extends QueryValue>(context: QueryContext, valueType: {new(...args: any[]): ValueType}): Promise<ValueType> {
        const initialValue = await this.getValue(context);
        if (initialValue instanceof valueType) {
            return initialValue;
        }
        throw new QueryEvaluationError(`Expected a ${valueType} value.`);
    }

    /**
     * Format this expression as a string in standard form, recursively.
     * e.g. if this is an addition expression, it could return the string "3 + 4"
     */
    public abstract toString(): string;
}
