import { QueryContext } from "./context.ts";
import { QueryEvaluationError } from "./errors.ts";
import { QueryValue } from "./values.ts";


/**
 * Base class for a Query Expression, something that evaluates to a value.
 */
export abstract class QueryExpression {
    public readonly type: string;

    constructor() {
        // We must put the "type" (subclass name) of this QueryExpression as an actual object value, otherwise
        // assertEquals() in the test suite will not be able to compare expressions by value properly.
        this.type = this.constructor.name;
    }

    public abstract getValue(context: QueryContext): Promise<QueryValue>;

    // deno-lint-ignore no-explicit-any
    public async getValueAs<ValueType extends QueryValue>(context: QueryContext, valueType: {new(...args: any[]): ValueType}): Promise<ValueType> {
        const initialValue = await this.getValue(context);
        if (initialValue instanceof valueType) {
            return initialValue;
        }
        // Try casting it:
        const castValue = initialValue.castTo(valueType, context);
        if (castValue !== undefined) {
            return castValue;
        }
        throw new QueryEvaluationError(`Expected a ${valueType.name} value, but got ${initialValue.constructor.name}.`);
    }

    /**
     * Format this expression as a string in standard form, recursively.
     * e.g. if this is an addition expression, it could return the string "3 + 4"
     */
    public abstract toString(): string;
}
