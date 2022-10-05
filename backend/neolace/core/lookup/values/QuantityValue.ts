import { Quantity, QuantityError } from "neolace/deps/quantity-math.ts";
import { LookupContext } from "../context.ts";
import { LookupEvaluationError } from "../errors.ts";
import { IntegerValue } from "../values.ts";
import { ClassOf, ConcreteValue, LookupValue } from "./base.ts";
import { BooleanValue } from "./BooleanValue.ts";

/**
 * A value that respresents an floating point number, optionally with units (e.g. "kg")
 */
export class QuantityValue extends ConcreteValue {
    public readonly parsedQuantity: Quantity;

    constructor(
        public readonly magnitude: number,
        public readonly units?: string,
    ) {
        super();
        if (typeof magnitude !== "number" || isNaN(magnitude) || !isFinite(magnitude)) {
            throw new Error("Internal error - quantity magnitude is not a number.");
        }
        try {
            this.parsedQuantity = new Quantity(magnitude, { units });
        } catch (err) {
            if (err instanceof QuantityError) {
                throw new LookupEvaluationError(err.message, { cause: err });
            }
            throw err;
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

    public override compareTo(otherValue: LookupValue) {
        if (otherValue instanceof QuantityValue) {
            // We always compare in terms of base units (which parsedQuantity has). This may not make sense if the
            // dimensions are different (comparing kg and m for example), but it will at least always give consistent
            // and sensible results.
            return this.parsedQuantity.magnitude - otherValue.parsedQuantity.magnitude;
        } else if (otherValue instanceof IntegerValue) {
            return this.parsedQuantity.magnitude - Number(otherValue.value);
        }
        throw new LookupEvaluationError(
            `Comparing ${this.constructor.name} and ${otherValue.constructor.name} values is not supported.`,
        );
    }
}
