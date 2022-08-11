import { LookupContext } from "../context.ts";
import { LookupEvaluationError } from "../errors.ts";
import type { LookupValue } from "../values/base.ts";

// deno-lint-ignore no-explicit-any
type ClassOf<QV extends LookupValue> = { new (...args: any[]): QV };

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

    public async getValueAs<ValueType extends LookupValue>(
        valueType: ClassOf<ValueType>,
        context: LookupContext,
    ): Promise<ValueType> {
        const initialValue = await this.getValue(context);
        if (initialValue instanceof valueType) {
            return initialValue;
        }
        // Try casting it:
        const castValue = await initialValue.castTo(valueType, context);
        if (castValue !== undefined) {
            return castValue;
        }
        throw new LookupEvaluationError(`The expression "${this.toDebugString()}" is not of the right type.`);
    }

    public async getValueAsOneOf<VT1 extends LookupValue>(
        valueTypes: [ClassOf<VT1>],
        context: LookupContext,
    ): Promise<VT1>;
    public async getValueAsOneOf<VT1 extends LookupValue, VT2 extends LookupValue>(
        valueTypes: [ClassOf<VT1>, ClassOf<VT2>],
        context: LookupContext,
    ): Promise<VT1 | VT2>;
    public async getValueAsOneOf<VT1 extends LookupValue, VT2 extends LookupValue, VT3 extends LookupValue>(
        valueTypes: [ClassOf<VT1>, ClassOf<VT2>, ClassOf<VT3>],
        context: LookupContext,
    ): Promise<VT1 | VT2 | VT3>;
    public async getValueAsOneOf<
        VT1 extends LookupValue,
        VT2 extends LookupValue,
        VT3 extends LookupValue,
        VT4 extends LookupValue,
    >(
        valueTypes: [ClassOf<VT1>, ClassOf<VT2>, ClassOf<VT3>, ClassOf<VT4>],
        context: LookupContext,
    ): Promise<VT1 | VT2 | VT3 | VT4>;
    public async getValueAsOneOf(
        valueTypes: Array<ClassOf<LookupValue>>,
        context: LookupContext,
    ): Promise<LookupValue> {
        const initialValue = await this.getValue(context);
        for (const valueType of valueTypes) {
            // Try casting it:
            const castValue = await initialValue.castTo(valueType, context);
            if (castValue !== undefined) {
                return castValue;
            }
        }
        throw new LookupEvaluationError(`The expression "${this.toDebugString()}" is not of the right type.`);
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
            return value.slice(0, 45) + "…" + value.slice(-4);
        }
    }
}
