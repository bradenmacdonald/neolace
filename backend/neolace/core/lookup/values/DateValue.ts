/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { LookupContext } from "../context.ts";
import { LookupEvaluationError } from "../errors.ts";
import { ClassOf, ConcreteValue, LookupValue } from "./base.ts";

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

    protected override doCastTo(_newType: ClassOf<LookupValue>, _context: LookupContext): LookupValue | undefined {
        return undefined;
    }

    protected override doCompareTo(otherValue: LookupValue) {
        if (otherValue instanceof DateValue) {
            const yearDiff = this.year - otherValue.year;
            if (yearDiff > 0) return 1;
            else if (yearDiff < 0) return -1;
            else {
                const monthDiff = this.month - otherValue.month;
                if (monthDiff > 0) return 1;
                else if (monthDiff < 0) return -1;
                else {
                    const dayDiff = this.day - otherValue.day;
                    if (dayDiff > 0) return 1;
                    else if (dayDiff < 0) return -1;
                    else return 0;
                }
            }
        }
        return super.doCompareTo(otherValue); // This will throw
    }
}
