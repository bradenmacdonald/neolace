import { LookupContext } from "./context.ts";
import { LookupEvaluationError } from "./errors.ts";
import { LookupValue } from "./values.ts";


/**
 * Base class for a Lookup Expression, something that evaluates to a value.
 */
export abstract class LookupExpression {
    public readonly type: string;

    constructor() {
        // We must put the "type" (subclass name) of this LookupExpression as an actual object value, otherwise
        // assertEquals() in the test suite will not be able to compare expressions by value properly.
        this.type = this.constructor.name;
    }

    public abstract getValue(context: LookupContext): Promise<LookupValue>;

    // deno-lint-ignore no-explicit-any
    public async getValueAs<ValueType extends LookupValue>(context: LookupContext, valueType: {new(...args: any[]): ValueType}): Promise<ValueType> {
        const initialValue = await this.getValue(context);
        if (initialValue instanceof valueType) {
            return initialValue;
        }
        // Try casting it:
        const castValue = initialValue.castTo(valueType, context);
        if (castValue !== undefined) {
            return castValue;
        }
        throw new LookupEvaluationError(`Expected a ${valueType.name} value, but got ${initialValue.constructor.name}.`);
    }

    /**
     * Format this expression as a string in standard form, recursively.
     * e.g. if this is an addition expression, it could return the string "3 + 4"
     */
    public abstract toString(): string;

    /**
     * Format this expression as a string, but if it's longer than 50 characters
     * just print the first part followed by an ellipsis.
     */
    public toDebugString(): string {
        const value = this.toString();
        if (value.length <= 50) {
            return value;
        } else {
            return value.slice(0, 45) + "…" + value.slice(-5);
        }
    }
}
