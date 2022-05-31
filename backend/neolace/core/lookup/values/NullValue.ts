import { LookupContext } from "../context.ts";
import { ClassOf, ConcreteValue, IHasLiteralExpression, LookupValue } from "./base.ts";
import { BooleanValue } from "./BooleanValue.ts";

/**
 * A null value
 */
export class NullValue extends ConcreteValue implements IHasLiteralExpression {
    /**
     * Return this value as a string, in Neolace Lookup Expression format.
     * This string should parse to an expression that yields the same value.
     */
    public override asLiteral(): string {
        return "null";
    }

    protected serialize() {
        return { type: "Null" as const };
    }

    protected override doCastTo(newType: ClassOf<LookupValue>, _context: LookupContext): LookupValue | undefined {
        if (newType === BooleanValue) {
            return new BooleanValue(false);
        }
        return undefined;
    }
}
