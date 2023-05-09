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
import { DateValue } from "./DateValue.ts";

/**
 * A value that respresents either a year, a year + month, a month (without year), or a month + day (without year).
 * It never represents an exact date with year, month, and day - that's DateValue.
 */
export class DatePartialValue extends ConcreteValue {
    /** Year () */
    readonly year: number | undefined;
    /** Month (January = 1) */
    readonly month: number | undefined;
    /** Day (1-31) */
    readonly day: number | undefined;

    constructor({ year, month, day }: { year?: bigint | number; month?: bigint | number; day?: bigint | number }) {
        super();
        this.year = year === undefined ? undefined : Number(year);
        this.month = month === undefined ? undefined : Number(month);
        this.day = day === undefined ? undefined : Number(day);
        // Validate:
        if (this.year !== undefined) {
            if (this.year < 1583 || this.year > 9999) {
                throw new LookupEvaluationError(`Invalid year "${this.year}"; needs to be between 1583 and 9999 CE.`);
            }
            // Month may or may not be defined; either way is valid.
            if (this.day !== undefined) {
                throw new LookupEvaluationError("DatePartialValue cannot have both year and day. Use Date instead.");
            }
        }
        if (this.month !== undefined) {
            if (this.month < 1 || this.month > 12) {
                throw new LookupEvaluationError(`Invalid month "${this.month}"; needs to be between 1 and 12.`);
            }
        }
        if (this.day !== undefined) {
            if (this.month === undefined) {
                throw new LookupEvaluationError(`Cannot specify a day without a month.`);
            }
            const maxDay = this.month == 2 ? 29 : [4, 6, 9, 11].includes(this.month) ? 30 : 31;
            if (this.day < 1 || this.day > maxDay) {
                throw new LookupEvaluationError(`Invalid day "${this.day}"; needs to be between 1 and ${maxDay}.`);
            }
        }
    }

    /**
     * Return this value as a string, in Neolace Lookup Expression format.
     * This string should parse to an expression that yields the same value.
     */
    public override asLiteral(): string {
        return `date("${this.asIsoString()}")`;
    }

    /**
     * Return this partial date as a string in ISO 8601 format.
     *
     * Technically, the representations for year+month, month+day, and month alone were only defined/allowed in the
     * 2000 version of ISO-8601 which has been superseded, but we still use them as there's no newer alternative.
     */
    public asIsoString(): string {
        if (this.year !== undefined) {
            const yearStr = this.year.toString().padStart(4, "0000");
            // Return "YYYY" or "YYYY-MM"
            return this.month === undefined ? yearStr : `${yearStr}-${this.month.toString().padStart(2, "0")}`;
        }
        if (this.month === undefined) throw new Error("month unexpectedly missing");
        if (this.day !== undefined) {
            // We are returning a month and day, in the format "--MM-DD"
            return `--${this.month.toString().padStart(2, "0")}-${this.day.toString().padStart(2, "0")}`;
        }
        // We are just returning a month, with no year or day.
        return `--${this.month.toString().padStart(2, "0")}`;
    }

    protected serialize() {
        const v: { type: "DatePartial"; value: string; year?: number; month?: number; day?: number } = {
            type: "DatePartial" as const,
            value: this.asIsoString(),
        };
        if (this.year) v.year = this.year;
        if (this.month) v.month = this.month;
        if (this.day) v.day = this.day;
        return v;
    }

    protected override doCastTo(_newType: ClassOf<LookupValue>, _context: LookupContext): LookupValue | undefined {
        // In the future we may support automatically casting to the nearest Date.
        return undefined;
    }

    /** For comparison purposes, fill in any missing values to force this to be a specific full YYYY-MM-DD date. */
    protected forceToDate(): DateValue {
        return new DateValue(this.year ?? 9999, this.month ?? 1, this.day ?? 1);
    }

    protected override doCompareTo(otherValue: LookupValue) {
        if (otherValue instanceof DateValue || otherValue instanceof DatePartialValue) {
            const asDate: DateValue = this.forceToDate();
            const otherDate: DateValue = otherValue instanceof DateValue ? otherValue : otherValue.forceToDate();
            return asDate.compareTo(otherDate);
        }
        return super.doCompareTo(otherValue); // This will throw
    }
}
