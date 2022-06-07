import { LookupContext } from "../context.ts";
import { LookupEvaluationError } from "../errors.ts";
import { ClassOf, ConcreteValue, LookupValue } from "./base.ts";
import { BooleanValue } from "./BooleanValue.ts";

/**
 * A value that respresents a calendar date (no time)
 */
export class DateValue extends ConcreteValue {
    readonly year: number;
    readonly month: number;
    readonly day: number;

    constructor(year: bigint | number, month: bigint | number, day: bigint | number) {
        super();
        this.year = Number(year);
        this.month = Number(month);
        this.day = Number(day);
        // Validate:
        let checkDate: Date;
        try {
            checkDate = new Date(this.asIsoString());
        } catch {
            throw new LookupEvaluationError("Invalid date value.");
        }
        if (
            checkDate.getUTCFullYear() !== this.year ||
            checkDate.getUTCMonth() !== this.month - 1 ||
            checkDate.getUTCDate() !== this.day
        ) {
            // This is an invalid date like February 30, which has rolled over into March
            throw new LookupEvaluationError("Invalid date value.");
        }
    }

    /**
     * Return this value as a string, in Neolace Lookup Expression format.
     * This string should parse to an expression that yields the same value.
     */
    public override asLiteral(): string {
        // An integer literal just looks like a plain integer, e.g. 5
        return `date("${this.asIsoString()}")`;
    }

    /** Return this date as a string in ISO 8601 format */
    public asIsoString(): string {
        return `${this.year.toString().padStart(4, "0000")}-${this.month.toString().padStart(2, "0")}-${
            this.day.toString().padStart(2, "0")
        }`;
    }

    protected serialize() {
        return { type: "Date" as const, value: this.asIsoString() };
    }

    protected override doCastTo(newType: ClassOf<LookupValue>, _context: LookupContext): LookupValue | undefined {
        if (newType === BooleanValue) {
            return new BooleanValue(true);
        }
        return undefined;
    }
}
