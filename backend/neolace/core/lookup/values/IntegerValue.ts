import { LookupContext } from "../context.ts";
import { ClassOf, ConcreteValue, LookupValue } from "./base.ts";
import { BooleanValue } from "./BooleanValue.ts";

/**
 * A value that respresents an integer (BigInt)
 */
export class IntegerValue extends ConcreteValue {
    readonly value: bigint;

    constructor(value: bigint | number) {
        super();
        this.value = BigInt(value);
    }

    /**
     * Return this value as a string, in Neolace Lookup Expression format.
     * This string should parse to an expression that yields the same value.
     */
    public override asLiteral(): string {
        // An integer literal just looks like a plain integer, e.g. 5
        return String(this.value);
    }

    protected serialize() {
        // Unfortunately JavaScript cannot serialize BigInt to JSON numbers (even though JSON numbers can have
        // arbitrary digits), so we have to serialize it as a string.
        return { value: String(this.value) };
    }

    protected override doCastTo(newType: ClassOf<LookupValue>, _context: LookupContext): LookupValue | undefined {
        if (newType === BooleanValue) {
            return new BooleanValue(this.value !== 0n);
        }
        return undefined;
    }
}
