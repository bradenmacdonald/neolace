import { LookupContext } from "../context.ts";
import { ClassOf, ConcreteValue, LookupValue } from "./base.ts";
import { BooleanValue } from "./BooleanValue.ts";

/**
 * A value that respresents an floating point number, optionally with units (e.g. "kg")
 */
export class QuantityValue extends ConcreteValue {
    constructor(
        public readonly magnitude: number,
        public readonly units?: string,
    ) {
        super();
        if (typeof magnitude !== "number" || isNaN(magnitude) || !isFinite(magnitude)) {
            throw new Error("Internal error - quantity magnitude is not a number.");
        }
    }

    /**
     * Return this value as a string, in Neolace Lookup Expression format.
     * This string should parse to an expression that yields the same value.
     */
    public override asLiteral(): string {
        // An integer literal just looks like a plain integer, e.g. 5
        return this.magnitude.toString(10) + (this.units ? ` [${this.units}]` : "");
    }

    protected serialize() {
        return { type: "Quantity" as const, magnitude: this.magnitude, units: this.units };
    }

    protected override doCastTo(newType: ClassOf<LookupValue>, _context: LookupContext): LookupValue | undefined {
        if (newType === BooleanValue) {
            if (this.magnitude !== 0 || this.units) {
                return new BooleanValue(true);
            }
            return new BooleanValue(false);
        }
        return undefined;
    }

    public override getSortString(): string {
        // Pad the number with zeroes so we get consistent sorting.
        return String(this.magnitude).padStart(100, "0");
        // TODO: use Quantity class to serialize in terms of base units.
        // TODO: if number is more than 1e99, use a special format.
        // else, use magnitude.toLocaleString('en-us', { useGrouping: false }) in order to avoid scientific notation
    }
}
