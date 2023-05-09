/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
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
        // For serialization, use the parsed version of the units for consistency
        // e.g. "km / h" and "km/h" are the same but may be different in this.units
        const units = this.parsedQuantity.get().units;

        const conversions: {
            /** The most important/expected conversion to display, if relevant */
            primary?: { magnitude: number; units: string };
            /** Conversion to base SI units, if not already in base units */
            base?: { magnitude: number; units: string };
            /** Conversion to US Customary System */
            uscs?: { magnitude: number; units: string };
        } = {};

        // Try converting to base SI
        try {
            const converted = this.parsedQuantity.getSI();
            if (converted.units && converted.units !== this.units) {
                conversions.base = { magnitude: converted.magnitude, units: converted.units };
            }
        } catch { /* Ignore errors if this can't be converted */ }

        // Specific conversions
        if (units === "m/s") {
            conversions.primary = this.parsedQuantity.getWithUnits("km/h");
            conversions.uscs = this.parsedQuantity.getWithUnits("mi/h");
        } else if (units === "mi/h") {
            conversions.primary = this.parsedQuantity.getWithUnits("km/h");
        } else if (units === "km/h") {
            conversions.uscs = this.parsedQuantity.getWithUnits("mi/h");
        } else if (units === "m") {
            conversions.uscs = this.parsedQuantity.getWithUnits("ft"); // We don't support "yard" at the moment.
        } else if (units === "kg") {
            conversions.uscs = this.parsedQuantity.getWithUnits("lb");
        } else if (units === "degC") {
            conversions.uscs = this.parsedQuantity.getWithUnits("degF");
        } else if (units === "degF") {
            conversions.primary = this.parsedQuantity.getWithUnits("degC");
        }

        return { type: "Quantity" as const, magnitude: this.magnitude, units, conversions };
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

    protected override doCompareTo(otherValue: LookupValue): number {
        if (otherValue instanceof QuantityValue) {
            // We always compare in terms of base units (which parsedQuantity has). This may not make sense if the
            // dimensions are different (comparing kg and m for example), but it will at least always give consistent
            // and sensible results.
            return this.parsedQuantity.magnitude - otherValue.parsedQuantity.magnitude;
        } else if (otherValue instanceof IntegerValue) {
            return this.parsedQuantity.magnitude - Number(otherValue.value);
        }
        return super.doCompareTo(otherValue); // This will throw
    }
}
